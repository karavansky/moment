import Fluent
import Vapor
import struct Foundation.Date

/// Fluent model for cities filtering in address autocomplete
final class City: Model, Content, @unchecked Sendable {
    static let schema = "cities"

    @ID(custom: "id", generatedBy: .database)
    var id: Int?

    @Field(key: "city")
    var city: String

    @Field(key: "firmaID")
    var firmaID: String

    @Timestamp(key: "createdAt", on: .create)
    var createdAt: Date?

    @Timestamp(key: "updatedAt", on: .update)
    var updatedAt: Date?

    init() {}

    init(id: Int? = nil, city: String, firmaID: String) {
        self.id = id
        self.city = city
        self.firmaID = firmaID
    }
}

/// DTO for creating a new city
struct CreateCityDTO: Content {
    let city: String
    let firmaID: String
}

/// DTO for updating a city
struct UpdateCityDTO: Content {
    let city: String?
}

/// DTO for city response
struct CityDTO: Content {
    let id: Int
    let city: String
    let firmaID: String
    let createdAt: Date?
    let updatedAt: Date?

    init(from city: City) throws {
        guard let id = city.id else {
            throw Abort(.internalServerError, reason: "City ID is missing")
        }
        self.id = id
        self.city = city.city
        self.firmaID = city.firmaID
        self.createdAt = city.createdAt
        self.updatedAt = city.updatedAt
    }
}
