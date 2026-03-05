import Vapor
import Fluent

final class PushSubscription: Model, @unchecked Sendable, Content {
    static let schema = "push_subscriptions"

    @ID(custom: "id", generatedBy: .database)
    var id: Int?

    @Field(key: "userID")
    var userID: String

    @Field(key: "endpoint")
    var endpoint: String

    @Field(key: "p256dh")
    var p256dh: String

    @Field(key: "auth")
    var auth: String

    @Timestamp(key: "createdAt", on: .none)
    var createdAt: Date?

    @Timestamp(key: "lastUsedAt", on: .none)
    var lastUsedAt: Date?

    init() {}

    init(userID: String, endpoint: String, p256dh: String, auth: String) {
        self.userID = userID
        self.endpoint = endpoint
        self.p256dh = p256dh
        self.auth = auth
    }
}
