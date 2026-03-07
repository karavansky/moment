import Foundation
@preconcurrency import Redis
import Vapor

/// Thread-safe cache for user status information stored in Redis
/// This eliminates SQLite queries from the hot path of message handling
final class UserStatusCache: @unchecked Sendable {
    private let redis: any RedisClient

    init(redis: any RedisClient) {
        self.redis = redis
    }

    /// Get user status from cache
    /// Returns nil if not cached
    func getUserStatus(username: String) async throws -> UserStatus? {
        let key = RedisKey("user_status:\(username)")

        let data = try await redis.get(key).get()

        guard let jsonData = data.string?.data(using: .utf8),
              let status = try? JSONDecoder().decode(UserStatus.self, from: jsonData)
        else {
            return nil
        }

        return status
    }

    /// Set user status in cache with TTL
    func setUserStatus(username: String, status: UserStatus, ttl: TimeAmount = .hours(24)) async throws {
        let key = RedisKey("user_status:\(username)")
        let encoder = JSONEncoder()
        let jsonData = try encoder.encode(status)
        guard let jsonString = String(data: jsonData, encoding: .utf8) else {
            throw RedisError(reason: "Failed to encode user status to JSON string")
        }

        _ = try await redis.set(key, to: jsonString).get()
        _ = try await redis.expire(key, after: ttl).get()
    }

    /// Update user status (merge with existing)
    func updateUserStatus(username: String, isOnline: Bool? = nil, cpuStatus: Int? = nil) async throws {
        var status = try await getUserStatus(username: username) ?? UserStatus(username: username)

        if let isOnline = isOnline {
            status.isOnline = isOnline
        }
        if let cpuStatus = cpuStatus {
            status.cpuStatus = cpuStatus
        }
        status.lastActivity = Date()

        try await setUserStatus(username: username, status: status)
    }

    /// Delete user status from cache
    func deleteUserStatus(username: String) async throws {
        let key = RedisKey("user_status:\(username)")
        _ = try await redis.delete([key]).get()
    }

    /// Get multiple user statuses in one batch
    func getBulkUserStatus(usernames: [String]) async throws -> [String: UserStatus] {
        var result: [String: UserStatus] = [:]

        // Use pipeline for batch retrieval
        for username in usernames {
            if let status = try await getUserStatus(username: username) {
                result[username] = status
            }
        }

        return result
    }
}

/// Cached user status structure
struct UserStatus: Codable, Sendable {
    var username: String
    var isOnline: Bool
    var cpuStatus: Int
    var lastActivity: Date

    init(username: String, isOnline: Bool = false, cpuStatus: Int = 0, lastActivity: Date = Date()) {
        self.username = username
        self.isOnline = isOnline
        self.cpuStatus = cpuStatus
        self.lastActivity = lastActivity
    }
}

/// Storage key for UserStatusCache in Application
struct UserStatusCacheKey: StorageKey {
    typealias Value = UserStatusCache
}

extension Application {
    var userStatusCache: UserStatusCache {
        get {
            guard let cache = self.storage[UserStatusCacheKey.self] else {
                fatalError("UserStatusCache not configured. Call app.userStatusCache = UserStatusCache(...) in configure.swift")
            }
            return cache
        }
        set {
            self.storage[UserStatusCacheKey.self] = newValue
        }
    }
}

extension Request {
    var userStatusCache: UserStatusCache {
        return application.userStatusCache
    }
}
