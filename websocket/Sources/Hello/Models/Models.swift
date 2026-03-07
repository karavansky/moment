import Fluent
import SQLKit
import Vapor

// User model
final class User: Model, Content, @unchecked Sendable {
    static let schema = "users"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "username")
    var username: String

    @Field(key: "passwordHash")
    var passwordHash: String

    @OptionalField(key: "token")
    var token: String?

    @Field(key: "status")
    var status: Int

    @Field(key: "is_online")
    var isOnline: Bool

    @Timestamp(key: "last_activity", on: .none)
    var lastActivity: Date?

    @OptionalField(key: "host")
    var host: String?

    init() {}

    init(
        id: UUID? = nil, username: String, passwordHash: String, token: String? = nil,
        status: Int = 0,
        isOnline: Bool = false, lastActivity: Date? = nil, host: String? = nil
    ) {
        self.id = id
        self.username = username
        self.passwordHash = passwordHash
        self.token = token
        self.status = status
        self.isOnline = isOnline
        self.lastActivity = lastActivity
        self.host = host
    }

    // MARK: - Session Management

    /// Create a new session for this user
    func createSession(on database: any Database, expiresIn: TimeInterval = 86400)
        -> EventLoopFuture<Session>
    {
        let session = Session(username: self.username, expiresIn: expiresIn)
        return session.save(on: database).map { session }
    }

    /// Verify password using BCrypt
    func verify(password: String) throws -> Bool {
        return try Bcrypt.verify(password, created: self.passwordHash)
    }
}

// Message model
final class Message: Model, Content, @unchecked Sendable {
    static let schema = "messages"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "username")
    var username: String

    @Field(key: "content")
    var content: String

    @Timestamp(key: "createdAt", on: .create)
    var createdAt: Date?

    init() {}

    init(id: UUID? = nil, username: String, content: String) {
        self.id = id
        self.username = username
        self.content = content
    }
}

// WebSocket message types - LEGACY (full keys for backward compatibility)
struct WSMessage: Content {
    let type: String
    let content: String
    let username: String?
    let timestamp: Double
    let host: String?
}

// OPTIMIZED: Short keys version (75% traffic reduction for typical messages)
// Mapping: type->t, content->c, username->u, timestamp->d, host->h
struct WSMessageShort: Content {
    let t: String  // type
    let c: String  // content
    let u: String? // username
    let d: Double?  // timestamp (date)
    let h: String? // host

    init(type: String, content: String, username: String?, timestamp: Double?, host: String?) {
        self.t = type
        self.c = content
        self.u = username
        self.d = timestamp
        self.h = host
    }
}

struct BaseMessage: Content {
    let type: String
}

struct CPUMessage: Content {
    let type: String
    let message: String
    let username: String?
}

struct LatencyPingMessage: Content {
    let type: String
    let clientTimestamp: Double
}

// DTOs
struct LoginRequest: Content {
    let username: String
    let password: String
}

struct RegisterRequest: Content {
    let username: String
    let password: String
    let host: String?
}

struct UserResponse: Content {
    let username: String
    let status: Int
    let isOnline: Bool
    let lastActivity: Date?
    let host: String?
    let activeSessions: Int
}

struct MessageResponse: Content {
    let id: UUID
    let username: String
    let content: String
    let createdAt: Date
}

struct AuthResponse: Content {
    let username: String
    let sessionId: String
    let expiresAt: Double?  // Unix timestamp when session expires

    init(username: String, sessionId: String, expiresAt: Double? = nil) {
        self.username = username
        self.sessionId = sessionId
        self.expiresAt = expiresAt
    }
}

// Update user requests
struct UpdatePasswordRequest: Content {
    let username: String
    let newPassword: String
}

struct UpdateHostRequest: Content {
    let username: String
    let host: String?
}

struct DeleteUserRequest: Content {
    let username: String
}

// Migrations
struct CreateUsers: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(User.schema)
            .id()
            .field("username", .string, .required)
            .field("passwordHash", .string, .required)
            .field("token", .string, .required)
            .field("status", .int, .required, .sql(.default(0)))
            .field("is_online", .bool, .required, .sql(.default(false)))
            .create()
    }

    func revert(on database: any Database) async throws {
        try await database.schema(User.schema).delete()
    }
}

struct CreateMessages: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(Message.schema)
            .id()
            .field("username", .string, .required)
            .field("content", .string, .required)
            .field("createdAt", .datetime, .required)
            .create()
    }

    func revert(on database: any Database) async throws {
        try await database.schema(Message.schema).delete()
    }
}

// UserStatusHistory model - tracks online/offline changes
final class UserStatusHistory: Model, Content, @unchecked Sendable {
    static let schema = "user_status_history"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "username")
    var username: String

    @Field(key: "is_online")
    var isOnline: Bool

    @Timestamp(key: "timestamp", on: .none)
    var timestamp: Date?

    init() {}

    init(
        id: UUID? = nil, username: String, isOnline: Bool,
        timestamp: Date? = Date()
    ) {
        self.id = id
        self.username = username
        self.isOnline = isOnline
        self.timestamp = timestamp
    }
}

// Response for status history
struct UserStatusHistoryResponse: Content {
    let username: String
    let isOnline: Bool
    let timestamp: Double
}

// Migration for UserStatusHistory
struct CreateUserStatusHistory: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(UserStatusHistory.schema)
            .id()
            .field("username", .string, .required)
            .field("is_online", .bool, .required)
            .field("timestamp", .datetime, .required)
            .create()
    }

    func revert(on database: any Database) async throws {
        try await database.schema(UserStatusHistory.schema).delete()
    }
}

// Migration to add lastActivity to existing users table
struct AddLastActivityToUsers: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(User.schema)
            .field("last_activity", .datetime)
            .update()
    }

    func revert(on database: any Database) async throws {
        try await database.schema(User.schema)
            .deleteField("last_activity")
            .update()
    }
}

// MARK: - Session Model

/// Session model for session-based authentication
final class Session: Model, Content, @unchecked Sendable {
    static let schema = "sessions"

    @ID(key: .id)
    var id: UUID?

    @Field(key: "session_id")
    var sessionId: String

    @Field(key: "username")
    var username: String

    @Field(key: "created_at")
    var createdAt: Double

    @Field(key: "expires_at")
    var expiresAt: Double

    @Field(key: "last_activity")
    var lastActivity: Double

    init() {}

    init(id: UUID? = nil, username: String, expiresIn: TimeInterval = 86400) {
        self.id = id
        self.username = username

        // Generate crypto-secure random sessionId
        self.sessionId = Session.generateSessionId()

        let now = Date().timeIntervalSince1970
        self.createdAt = now
        self.expiresAt = now + expiresIn
        self.lastActivity = now
    }

    static func generateSessionId() -> String {
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
    /// Update session expiration (sliding expiration)
    func refresh(expiresIn: TimeInterval = 86400) {
        let now = Date().timeIntervalSince1970
        self.expiresAt = now + expiresIn
        self.lastActivity = now
    }

    /// Check if session is expired
    var isExpired: Bool {
        return Date().timeIntervalSince1970 > expiresAt
    }
}

// MARK: - Session Migration

struct CreateSession: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(Session.schema)
            .id()
            .field("session_id", .string, .required)
            .field("username", .string, .required)
            .field("created_at", .double, .required)
            .field("expires_at", .double, .required)
            .field("last_activity", .double, .required)
            .unique(on: "session_id")
            .foreignKey("username", references: User.schema, "username", onDelete: .cascade)
            .create()

        // Create indexes using raw SQL (SQLite doesn't support createIndex in Fluent)
        if let sql = database as? any SQLDatabase {
            try await sql.raw(
                "CREATE INDEX IF NOT EXISTS idx_sessions_session_id ON sessions(session_id)"
            ).run()
            try await sql.raw(
                "CREATE INDEX IF NOT EXISTS idx_sessions_username ON sessions(username)"
            ).run()
            try await sql.raw(
                "CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at)"
            ).run()
            try await sql.raw(
                "CREATE INDEX IF NOT EXISTS idx_sessions_last_activity ON sessions(last_activity)"
            ).run()
        }
    }

    func revert(on database: any Database) async throws {
        try await database.schema(Session.schema).delete()
    }
}

// MARK: - Make User.token optional migration
struct MakeUserTokenOptional: AsyncMigration {
    func prepare(on database: any Database) async throws {
        // SQLite doesn't support ALTER COLUMN, so we need to:
        // 1. Create new table with optional token
        // 2. Copy data
        // 3. Drop old table
        // 4. Rename new table

        // But Fluent doesn't support this well, so we use raw SQL
        if let sql = database as? any SQLDatabase {
            // Update existing tokens to NULL for users without tokens
            try await sql.raw("UPDATE users SET token = NULL WHERE token = ''").run()
        }
    }

    func revert(on database: any Database) async throws {
        // Cannot revert - making field non-nullable would require data
    }
}

// MARK: - Add unique constraint to username
struct AddUniqueUsernameConstraint: AsyncMigration {
    func prepare(on database: any Database) async throws {
        if let sql = database as? any SQLDatabase {
            // Create unique index on username
            try await sql.raw(
                "CREATE UNIQUE INDEX IF NOT EXISTS idx_users_username ON users(username)"
            ).run()
        }
    }

    func revert(on database: any Database) async throws {
        if let sql = database as? any SQLDatabase {
            try await sql.raw("DROP INDEX IF EXISTS idx_users_username").run()
        }
    }
}

// MARK: - Add host field to users table
struct AddHostToUsers: AsyncMigration {
    func prepare(on database: any Database) async throws {
        try await database.schema(User.schema)
            .field("host", .string)
            .update()
    }

    func revert(on database: any Database) async throws {
        try await database.schema(User.schema)
            .deleteField("host")
            .update()
    }
}
