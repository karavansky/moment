import Vapor
@preconcurrency import Redis
import NIOCore

/// Redis-based session manager
final class SessionManager: @unchecked Sendable {
    private let app: Application
    private let sessionPrefix = "session:"
    private let usernamePrefix = "username:"

    init(app: Application) {
        self.app = app
    }

    private var redis: any RedisClient {
        return app.redis
    }
    
    // MARK: - Session Operations
    
    /// Create new session and store in Redis
    func createSession(username: String, expiresIn: TimeInterval = 86400, skipCleanup: Bool = true) async throws -> String {
        // Clean up expired sessions for this user before creating new one
        // By default, skip cleanup on login for performance (cleanup runs on ping/pong timeout)
        if !skipCleanup {
            try? await cleanupExpiredSessions(username: username)
        }

        let sessionId = generateSessionId()
        let now = Date().timeIntervalSince1970
        let expiresAt = now + expiresIn

        // Store session data as JSON string
        let sessionKey = RedisKey(sessionPrefix + sessionId)

        let sessionData: [String: String] = [
            "username": username,
            "created_at": String(now),
            "expires_at": String(expiresAt),
            "last_activity": String(now)
        ]

        let jsonData = try JSONEncoder().encode(sessionData)
        let jsonString = String(data: jsonData, encoding: .utf8)!

        try await redis.set(sessionKey, to: jsonString).get()
        _ = try await redis.expire(sessionKey, after: .seconds(Int64(expiresIn))).get()

        // Add to user's sessions set
        let userSessionsKey = RedisKey(usernamePrefix + username)
        _ = try await redis.sadd(sessionId, to: userSessionsKey).get()

        return sessionId
    }
    
    /// Get session by ID
    func getSession(sessionId: String) async throws -> SessionData? {
        let sessionKey = RedisKey(sessionPrefix + sessionId)
        
        guard let jsonString = try await redis.get(sessionKey, as: String.self).get() else {
            return nil
        }
        
        guard let jsonData = jsonString.data(using: .utf8),
              let data = try? JSONDecoder().decode([String: String].self, from: jsonData) else {
            return nil
        }
        
        guard let username = data["username"],
              let createdAtStr = data["created_at"],
              let expiresAtStr = data["expires_at"],
              let lastActivityStr = data["last_activity"],
              let createdAt = Double(createdAtStr),
              let expiresAt = Double(expiresAtStr),
              let lastActivity = Double(lastActivityStr) else {
            return nil
        }
        
        // Check if expired
        if Date().timeIntervalSince1970 > expiresAt {
            try? await deleteSession(sessionId: sessionId)
            return nil
        }
        
        return SessionData(
            sessionId: sessionId,
            username: username,
            createdAt: createdAt,
            expiresAt: expiresAt,
            lastActivity: lastActivity
        )
    }
    
    /// Update session activity timestamp and extend TTL
    func updateActivity(sessionId: String, expiresIn: TimeInterval = 86400) async throws {
        let sessionKey = RedisKey(sessionPrefix + sessionId)

        // Get current session
        guard let jsonString = try await redis.get(sessionKey, as: String.self).get(),
              let jsonData = jsonString.data(using: .utf8),
              var data = try? JSONDecoder().decode([String: String].self, from: jsonData) else {
            return
        }

        // Update last activity and expiration
        let now = Date().timeIntervalSince1970
        let expiresAt = now + expiresIn
        data["last_activity"] = String(now)
        data["expires_at"] = String(expiresAt)

        // Save back
        let newJsonData = try JSONEncoder().encode(data)
        let newJsonString = String(data: newJsonData, encoding: .utf8)!

        try await redis.set(sessionKey, to: newJsonString).get()

        // ВАЖНО: Продлить TTL в Redis (sliding expiration)
        _ = try await redis.expire(sessionKey, after: .seconds(Int64(expiresIn))).get()
    }
    
    /// Delete session
    func deleteSession(sessionId: String) async throws {
        let sessionKey = RedisKey(sessionPrefix + sessionId)

        // Get username first
        if let jsonString = try? await redis.get(sessionKey, as: String.self).get(),
           let jsonData = jsonString.data(using: .utf8),
           let data = try? JSONDecoder().decode([String: String].self, from: jsonData),
           let username = data["username"] {
            // Remove from user's sessions set
            let userSessionsKey = RedisKey(usernamePrefix + username)
            _ = try? await redis.srem(sessionId, from: userSessionsKey).get()
        }

        // Delete session key
        _ = try await redis.delete(sessionKey).get()
    }

    /// Delete session and cleanup expired sessions for the user
    /// Should be called on ping/pong timeout to clean up stale session references
    func deleteSessionWithCleanup(sessionId: String) async throws {
        let sessionKey = RedisKey(sessionPrefix + sessionId)

        // Get username first
        var username: String?
        if let jsonString = try? await redis.get(sessionKey, as: String.self).get(),
           let jsonData = jsonString.data(using: .utf8),
           let data = try? JSONDecoder().decode([String: String].self, from: jsonData) {
            username = data["username"]

            // Remove from user's sessions set
            if let user = username {
                let userSessionsKey = RedisKey(usernamePrefix + user)
                _ = try? await redis.srem(sessionId, from: userSessionsKey).get()
            }
        }

        // Delete session key
        _ = try await redis.delete(sessionKey).get()

        // Run cleanup for this user to remove other expired sessions
        if let user = username {
            try? await cleanupExpiredSessions(username: user)
        }
    }

    /// Get all sessions for a user
    func getUserSessions(username: String) async throws -> [String] {
        let userSessionsKey = RedisKey(usernamePrefix + username)
        return try await withCheckedThrowingContinuation { continuation in
            redis.smembers(of: userSessionsKey).whenComplete { result in
                switch result {
                case .success(let members):
                    let strings = members.compactMap { $0.string }
                    continuation.resume(returning: strings)
                case .failure(let error):
                    continuation.resume(throwing: error)
                }
            }
        }
    }

    /// Get active sessions count for a user (from Redis set)
    /// Only counts sessions that actually exist and have recent activity
    func getUserActiveSessionsCount(username: String) async throws -> Int {
        // Get all session IDs from the set
        let sessionIds = try await getUserSessions(username: username)
        let userSessionsKey = RedisKey(usernamePrefix + username)
        let now = Date().timeIntervalSince1970

        // Count only sessions that exist AND have recent activity (last 2 minutes)
        // Ping interval is 20 seconds, so 2 minutes = 6 missed pings
        let activityThreshold: TimeInterval = 120 // 2 minutes

        var validCount = 0
        for sessionId in sessionIds {
            let sessionKey = RedisKey(sessionPrefix + sessionId)

            // Check if session exists
            guard let jsonString = try? await redis.get(sessionKey, as: String.self).get(),
                  let jsonData = jsonString.data(using: .utf8),
                  let data = try? JSONDecoder().decode([String: String].self, from: jsonData),
                  let lastActivityStr = data["last_activity"],
                  let lastActivity = Double(lastActivityStr) else {
                // Session doesn't exist or is malformed - remove from set
                _ = try? await redis.srem(sessionId, from: userSessionsKey).get()
                continue
            }

            // Check if activity is recent
            if now - lastActivity < activityThreshold {
                validCount += 1
            } else {
                // Session exists but is stale (no ping/pong) - keep it but don't count
                // TTL will clean it up eventually
            }
        }

        return validCount
    }
    
    /// Delete all sessions for a user
    func deleteUserSessions(username: String) async throws {
        let sessionIds = try await getUserSessions(username: username)
        
        for sessionId in sessionIds {
            try await deleteSession(sessionId: sessionId)
        }
    }
    
    /// Refresh session expiration
    func refreshSession(sessionId: String, expiresIn: TimeInterval = 86400) async throws {
        let sessionKey = RedisKey(sessionPrefix + sessionId)
        
        // Get current session
        guard let jsonString = try await redis.get(sessionKey, as: String.self).get(),
              let jsonData = jsonString.data(using: .utf8),
              var data = try? JSONDecoder().decode([String: String].self, from: jsonData) else {
            return
        }
        
        let now = Date().timeIntervalSince1970
        let expiresAt = now + expiresIn
        
        data["expires_at"] = String(expiresAt)
        data["last_activity"] = String(now)
        
        let newJsonData = try JSONEncoder().encode(data)
        let newJsonString = String(data: newJsonData, encoding: .utf8)!
        
        try await redis.set(sessionKey, to: newJsonString).get()
        _ = try await redis.expire(sessionKey, after: .seconds(Int64(expiresIn))).get()
    }
    
    // MARK: - Cleanup

    /// Remove expired session IDs from username set
    /// Called on login to clean up stale entries
    /// OPTIMIZED: Uses parallel execution instead of sequential
    private func cleanupExpiredSessions(username: String) async throws {
        let sessionIds = try await getUserSessions(username: username)
        let userSessionsKey = RedisKey(usernamePrefix + username)

        // Check all sessions in parallel using TaskGroup
        var expiredSessionIds: [String] = []

        try await withThrowingTaskGroup(of: (String, Int).self) { group in
            for sessionId in sessionIds {
                group.addTask {
                    let sessionKey = RedisKey(self.sessionPrefix + sessionId)
                    let exists = try await self.redis.exists(sessionKey).get()
                    return (sessionId, exists)
                }
            }

            // Collect expired sessions
            for try await (sessionId, exists) in group {
                if exists == 0 {
                    expiredSessionIds.append(sessionId)
                }
            }
        }

        // Remove expired sessions from set (can also be done in parallel)
        if !expiredSessionIds.isEmpty {
            for sessionId in expiredSessionIds {
                _ = try? await redis.srem(sessionId, from: userSessionsKey).get()
            }
            print("[SessionManager] Cleaned up \(expiredSessionIds.count) expired sessions for user '\(username)'")
        }
    }

    // MARK: - Statistics
    
    /// Get total active sessions count
    func getActiveSessionsCount() async throws -> Int {
        // Simplified: use DBSIZE or count pattern
        // For production, use SCAN
        return 0  // Placeholder - Redis KEYS is blocking
    }
    
    /// Get unique users count
    func getUniqueUsersCount() async throws -> Int {
        return 0  // Placeholder
    }
    
    // MARK: - Private
    
    private func generateSessionId() -> String {
        // Generate 22-character base62-like ID (similar to nanoid)
        let charset = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"
        let charsetArray = Array(charset)
        
        // Generate cryptographically secure random bytes
        var randomBytes = [UInt8](repeating: 0, count: 22)
        for i in 0..<22 {
            randomBytes[i] = UInt8.random(in: 0...255)
        }
        
        // Map each byte to a character from charset
        return randomBytes.map { byte in
            String(charsetArray[Int(byte) % charsetArray.count])
        }.joined()
    }
}

// MARK: - Session Data

struct SessionData: Content {
    let sessionId: String
    let username: String
    let createdAt: Double
    let expiresAt: Double
    let lastActivity: Double
    
    var isExpired: Bool {
        return Date().timeIntervalSince1970 > expiresAt
    }
}

// MARK: - Storage Key

struct SessionManagerKey: StorageKey {
    typealias Value = SessionManager
}

extension Application {
    var sessionManager: SessionManager {
        get {
            guard let manager = storage[SessionManagerKey.self] else {
                fatalError("SessionManager not configured. Use app.sessionManager = SessionManager(...)")
            }
            return manager
        }
        set {
            storage[SessionManagerKey.self] = newValue
        }
    }
}

extension Request {
    var sessionManager: SessionManager {
        return application.sessionManager
    }
}