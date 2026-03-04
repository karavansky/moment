import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `sessions` table.
/// Used to validate that a JWT's session is still active in the database.
final class DBSession: Model, @unchecked Sendable {
    static let schema = "sessions"

    @ID(custom: "sessionID", generatedBy: .user)
    var id: String?

    @Field(key: "userID")
    var userID: String

    @Field(key: "expiresAt")
    var expiresAt: Date

    @Field(key: "createdAt")
    var createdAt: Date

    @OptionalField(key: "userAgent")
    var userAgent: String?

    @OptionalField(key: "ip")
    var ip: String?

    init() {}
}
