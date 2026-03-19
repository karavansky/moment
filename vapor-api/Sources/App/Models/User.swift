import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `users` table.
/// Read-only mapping — no Fluent migrations; schema is managed by Next.js.
final class User: Model, @unchecked Sendable {
    static let schema = "users"

    @ID(custom: "userID", generatedBy: .user)
    var id: String?

    @Field(key: "name")
    var name: String

    @Field(key: "email")
    var email: String

    @Field(key: "token")
    var token: String?

    @Field(key: "date")
    var date: Date

    @Field(key: "provider")
    var provider: String

    @Field(key: "isAdmin")
    var isAdmin: Bool

    @OptionalField(key: "firmaID")
    var firmaID: String?

    @Field(key: "passwordHash")
    var passwordHash: String?

    @OptionalField(key: "emailVerified")
    var emailVerified: Bool?

    @OptionalField(key: "status")
    var status: Int?

    @OptionalField(key: "pushNotificationsEnabled")
    var pushNotificationsEnabled: Bool?

    @OptionalField(key: "geolocationEnabled")
    var geolocationEnabled: Bool?

    @OptionalField(key: "lastLoginAt")
    var lastLoginAt: Date?

    @OptionalField(key: "pwaVersion")
    var pwaVersion: String?

    @OptionalField(key: "osVersion")
    var osVersion: String?

    @OptionalField(key: "batteryLevel")
    var batteryLevel: Int?

    @OptionalField(key: "batteryStatus")
    var batteryStatus: String?

    @Field(key: "lang")
    var lang: String

    @Field(key: "country")
    var country: String

    @OptionalField(key: "citiesID")
    var citiesID: [Int]?

    init() {}
}
