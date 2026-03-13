import Vapor
import Fluent

final class Ticket: Model, @unchecked Sendable, Content {
    static let schema = "ticket" // note singular, matches DB

    @ID(custom: "ticketID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "userID")
    var userID: String

    @Field(key: "subject")
    var subject: String

    @Field(key: "category")
    var category: Int

    @Field(key: "priority")
    var priority: Int

    @Timestamp(key: "date", on: .none)
    var date: Date?

    @Children(for: \.$ticket)
    var messages: [Message]

    init() {}
}

final class Message: Model, @unchecked Sendable, Content {
    static let schema = "messages"

    @ID(custom: "messageID", generatedBy: .user)
    var id: String?

    @Parent(key: "ticketID")
    var ticket: Ticket

    @Field(key: "senderID")
    var senderID: String

    @Field(key: "message")
    var text: String

    @Timestamp(key: "createdAt", on: .create)
    var createdAt: Date?

    init() {}
}
