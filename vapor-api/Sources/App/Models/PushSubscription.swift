import Vapor
import Fluent

final class PushSubscription: Model, @unchecked Sendable, Content {
    static let schema = "push_subscriptions"

    @ID(custom: "id", generatedBy: .user)
    var id: String?

    @Field(key: "userID")
    var userID: String

    @Field(key: "endpoint")
    var endpoint: String

    @Field(key: "p256dh")
    var p256dh: String

    @Field(key: "auth")
    var auth: String

    // Read-only mapped from DB 'created_at' if needed, but Next.js didn't expose it
    
    init() {}

    init(id: String, userID: String, endpoint: String, p256dh: String, auth: String) {
        self.id = id
        self.userID = userID
        self.endpoint = endpoint
        self.p256dh = p256dh
        self.auth = auth
    }
}
