import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `orders` table.
/// Represents a transport order in the taxi/corporate transport system.
final class Order: Model, @unchecked Sendable, Content {
    static let schema = "orders"

    @ID(custom: "orderID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "clientID")
    var clientID: String

    @OptionalField(key: "dispatcherID")
    var dispatcherID: String?

    @OptionalField(key: "driverID")
    var driverID: String?

    @OptionalField(key: "vehicleID")
    var vehicleID: String?

    @OptionalField(key: "appointmentID")
    var appointmentID: String?

    @OptionalField(key: "scheduledTime")
    var scheduledTime: Date?

    @Field(key: "status")
    var status: String // CREATED, ASSIGNED, ACCEPTED, ARRIVED, IN_PROGRESS, COMPLETED, CANCELLED

    @OptionalField(key: "clientComment")
    var clientComment: String?

    @OptionalField(key: "phone")
    var phone: String?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    @OptionalField(key: "assignedAt")
    var assignedAt: Date?

    @OptionalField(key: "acceptedAt")
    var acceptedAt: Date?

    @OptionalField(key: "arrivedAt")
    var arrivedAt: Date?

    @OptionalField(key: "startedAt")
    var startedAt: Date?

    @OptionalField(key: "completedAt")
    var completedAt: Date?

    @OptionalField(key: "cancelledAt")
    var cancelledAt: Date?

    init() {}
}

// MARK: - DTO (Data Transfer Object) for API responses

struct OrderDTO: Content {
    let id: String
    let firmaID: String
    let clientID: String
    let dispatcherID: String?
    let driverID: String?
    let vehicleID: String?
    let appointmentID: String?
    let scheduledTime: Date?
    let status: String
    let clientComment: String?
    let phone: String?
    let createdAt: Date?
    let assignedAt: Date?
    let acceptedAt: Date?
    let arrivedAt: Date?
    let startedAt: Date?
    let completedAt: Date?
    let cancelledAt: Date?
    let routes: [TransportRouteDTO]?

    init(from order: Order, routes: [TransportRoute]? = nil) throws {
        guard let id = order.id else {
            throw Abort(.internalServerError, reason: "Order ID is nil")
        }
        self.id = id
        self.firmaID = order.firmaID
        self.clientID = order.clientID
        self.dispatcherID = order.dispatcherID
        self.driverID = order.driverID
        self.vehicleID = order.vehicleID
        self.appointmentID = order.appointmentID
        self.scheduledTime = order.scheduledTime
        self.status = order.status
        self.clientComment = order.clientComment
        self.phone = order.phone
        self.createdAt = order.createdAt
        self.assignedAt = order.assignedAt
        self.acceptedAt = order.acceptedAt
        self.arrivedAt = order.arrivedAt
        self.startedAt = order.startedAt
        self.completedAt = order.completedAt
        self.cancelledAt = order.cancelledAt
        self.routes = try routes?.map { try TransportRouteDTO(from: $0) }
    }
}
