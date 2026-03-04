import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `teams` table.
final class Team: Model, @unchecked Sendable, Content {
    static let schema = "teams"

    @ID(custom: "teamID", generatedBy: .user)
    var id: String?

    @Field(key: "teamName")
    var teamName: String

    @Field(key: "firmaID")
    var firmaID: String

    init() {}
}
