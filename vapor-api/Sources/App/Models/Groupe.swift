import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `groupes` table.
final class Groupe: Model, @unchecked Sendable, Content {
    static let schema = "groupes"

    @ID(custom: "groupeID", generatedBy: .user)
    var id: String?

    @Field(key: "groupeName")
    var groupeName: String

    @Field(key: "firmaID")
    var firmaID: String

    init() {}
}
