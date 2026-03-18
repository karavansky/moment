import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the `vehicle_drivers` table.
/// Represents driver assignment history for vehicles.
final class VehicleDriver: Model, @unchecked Sendable, Content {
    static let schema = "vehicle_drivers"

    @ID(custom: "historyID", generatedBy: .user)
    var id: String?

    @Field(key: "vehicleID")
    var vehicleID: String

    @Field(key: "driverID")
    var driverID: String

    @Field(key: "assignedAt")
    var assignedAt: Date

    @OptionalField(key: "unassignedAt")
    var unassignedAt: Date?

    @OptionalField(key: "assignedBy")
    var assignedBy: String?

    @OptionalField(key: "notes")
    var notes: String?

    init() {}

    init(id: String? = nil,
         vehicleID: String,
         driverID: String,
         assignedAt: Date = Date(),
         unassignedAt: Date? = nil,
         assignedBy: String? = nil,
         notes: String? = nil) {
        self.id = id
        self.vehicleID = vehicleID
        self.driverID = driverID
        self.assignedAt = assignedAt
        self.unassignedAt = unassignedAt
        self.assignedBy = assignedBy
        self.notes = notes
    }
}

// MARK: - DTO (Data Transfer Object) for API responses

struct VehicleDriverDTO: Content {
    let historyID: String
    let vehicleID: String
    let driverID: String
    let driverName: String?
    let driverSurname: String?
    let assignedAt: Date
    let unassignedAt: Date?
    let assignedBy: String?
    let notes: String?
    let isActive: Bool

    init(from history: VehicleDriver, driverName: String? = nil, driverSurname: String? = nil) throws {
        guard let id = history.id else {
            throw Abort(.internalServerError, reason: "VehicleDriver ID is nil")
        }
        self.historyID = id
        self.vehicleID = history.vehicleID
        self.driverID = history.driverID
        self.driverName = driverName
        self.driverSurname = driverSurname
        self.assignedAt = history.assignedAt
        self.unassignedAt = history.unassignedAt
        self.assignedBy = history.assignedBy
        self.notes = history.notes
        self.isActive = history.unassignedAt == nil
    }
}
