import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `vehicles` table.
/// Represents a vehicle in the transport system (taxi/corporate transport).
final class Vehicle: Model, @unchecked Sendable, Content {
    static let schema = "vehicles"

    @ID(custom: "vehicleID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "plateNumber")
    var plateNumber: String

    @Field(key: "type")
    var type: String // STANDARD, MINIVAN, WHEELCHAIR

    @Field(key: "status")
    var status: String // ACTIVE, REPAIR, INACTIVE

    @OptionalField(key: "currentDriverID")
    var currentDriverID: String?

    @OptionalField(key: "currentLat")
    var currentLat: Double?

    @OptionalField(key: "currentLng")
    var currentLng: Double?

    @OptionalField(key: "lastLocationUpdate")
    var lastLocationUpdate: Date?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    init() {}
}

// MARK: - DTO (Data Transfer Object) for API responses

struct VehicleDTO: Content {
    let id: String
    let firmaID: String
    let plateNumber: String
    let type: String
    let status: String
    let currentDriverID: String?
    let currentDriverName: String?
    let currentDriverSurname: String?
    let currentLat: Double?
    let currentLng: Double?
    let lastLocationUpdate: Date?
    let createdAt: Date?

    init(from vehicle: Vehicle, driverName: String? = nil, driverSurname: String? = nil) throws {
        guard let id = vehicle.id else {
            throw Abort(.internalServerError, reason: "Vehicle ID is nil")
        }
        self.id = id
        self.firmaID = vehicle.firmaID
        self.plateNumber = vehicle.plateNumber
        self.type = vehicle.type
        self.status = vehicle.status
        self.currentDriverID = vehicle.currentDriverID
        self.currentDriverName = driverName
        self.currentDriverSurname = driverSurname
        self.currentLat = vehicle.currentLat
        self.currentLng = vehicle.currentLng
        self.lastLocationUpdate = vehicle.lastLocationUpdate
        self.createdAt = vehicle.createdAt
    }
}
