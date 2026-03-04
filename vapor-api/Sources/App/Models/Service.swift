import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `services` table.
final class Service: Model, @unchecked Sendable, Content {
    static let schema = "services"

    @ID(custom: "serviceID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "name")
    var name: String

    @OptionalField(key: "description")
    var description: String?

    @OptionalField(key: "duration")
    var duration: Int?

    @OptionalField(key: "price")
    var price: Double?

    @OptionalField(key: "parentId")
    var parentId: String?

    @OptionalField(key: "isGroup")
    var isGroup: Bool?

    @OptionalField(key: "order")
    var order: Int?

    init() {}
}
