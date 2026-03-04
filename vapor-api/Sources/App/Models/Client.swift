import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `clients` table.
final class Client: Model, @unchecked Sendable, Content {
    static let schema = "clients"

    @ID(custom: "clientID", generatedBy: .user)
    var id: String?

    @OptionalField(key: "userID")
    var userID: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "name")
    var name: String

    @OptionalField(key: "surname")
    var surname: String?

    @OptionalField(key: "email")
    var email: String?

    @OptionalField(key: "phone")
    var phone: String?

    @OptionalField(key: "phone2")
    var phone2: String?

    @Field(key: "status")
    var status: Int

    @OptionalField(key: "groupeID")
    var groupeID: String?

    @OptionalField(key: "country")
    var country: String?

    @OptionalField(key: "street")
    var street: String?

    @OptionalField(key: "postalCode")
    var postalCode: String?

    @OptionalField(key: "city")
    var city: String?

    @OptionalField(key: "houseNumber")
    var houseNumber: String?

    @OptionalField(key: "apartment")
    var apartment: String?

    @OptionalField(key: "district")
    var district: String?

    @OptionalField(key: "latitude")
    var latitude: Double?

    @OptionalField(key: "longitude")
    var longitude: Double?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    init() {}
}
