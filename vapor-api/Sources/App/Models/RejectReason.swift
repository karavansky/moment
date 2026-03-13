import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `reject_reasons` table.
/// Dictionary of reasons why a driver might reject an order.
final class RejectReason: Model, @unchecked Sendable, Content {
    static let schema = "reject_reasons"

    @ID(custom: "reasonID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "reasonText")
    var reasonText: String

    @Field(key: "isActive")
    var isActive: Bool

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    init() {}
}

// MARK: - DTO

struct RejectReasonDTO: Content {
    let id: String
    let firmaID: String
    let reasonText: String
    let isActive: Bool
    let createdAt: Date?

    init(from reason: RejectReason) throws {
        guard let id = reason.id else {
            throw Abort(.internalServerError, reason: "RejectReason ID is nil")
        }
        self.id = id
        self.firmaID = reason.firmaID
        self.reasonText = reason.reasonText
        self.isActive = reason.isActive
        self.createdAt = reason.createdAt
    }
}
