import Vapor
import Fluent

/// Fluent model mapping to the existing `organisations` table.
final class Organisation: Model, @unchecked Sendable, Content {
    static let schema = "organisations"

    @ID(custom: "firmaID", generatedBy: .user)
    var id: String?

    @Field(key: "organisationName")
    var organisationName: String

    init() {}
}
