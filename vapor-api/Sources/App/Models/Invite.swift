import Vapor
import Fluent

final class Invite: Model, @unchecked Sendable, Content {
    static let schema = "invites"

    @ID(custom: "inviteID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "userID")
    var userID: String

    @Field(key: "token")
    var token: String

    @Field(key: "status")
    var status: Int

    @Field(key: "expiresAt")
    var expiresAt: Date

    init() {}

    init(id: String, firmaID: String, userID: String, token: String, status: Int, expiresAt: Date) {
        self.id = id
        self.firmaID = firmaID
        self.userID = userID
        self.token = token
        self.status = status
        self.expiresAt = expiresAt
    }
}
