import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `routes` table.
/// Represents a route segment in a multi-stop transport order.
final class TransportRoute: Model, @unchecked Sendable, Content {
    static let schema = "routes"

    @ID(custom: "routeID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "orderID")
    var orderID: String

    @Field(key: "sequence")
    var sequence: Int

    @Field(key: "pickupAddress")
    var pickupAddress: String

    @Field(key: "dropoffAddress")
    var dropoffAddress: String

    @OptionalField(key: "pickupLat")
    var pickupLat: Double?

    @OptionalField(key: "pickupLng")
    var pickupLng: Double?

    @OptionalField(key: "dropoffLat")
    var dropoffLat: Double?

    @OptionalField(key: "dropoffLng")
    var dropoffLng: Double?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    init() {}
}

// MARK: - DTO (Data Transfer Object) for API responses

struct TransportRouteDTO: Content {
    let id: String
    let firmaID: String
    let orderID: String
    let sequence: Int
    let pickupAddress: String
    let dropoffAddress: String
    let pickupLat: Double?
    let pickupLng: Double?
    let dropoffLat: Double?
    let dropoffLng: Double?
    let createdAt: Date?

    init(from route: TransportRoute) throws {
        guard let id = route.id else {
            throw Abort(.internalServerError, reason: "Route ID is nil")
        }
        self.id = id
        self.firmaID = route.firmaID
        self.orderID = route.orderID
        self.sequence = route.sequence
        self.pickupAddress = route.pickupAddress
        self.dropoffAddress = route.dropoffAddress
        self.pickupLat = route.pickupLat
        self.pickupLng = route.pickupLng
        self.dropoffLat = route.dropoffLat
        self.dropoffLng = route.dropoffLng
        self.createdAt = route.createdAt
    }
}
