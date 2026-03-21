import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `appointments` table.
final class Appointment: Model, @unchecked Sendable, Content {
    static let schema = "appointments"

    @ID(custom: "appointmentID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "userID")
    var userID: String

    @Field(key: "clientID")
    var clientID: String

    @Field(key: "workerId")
    var workerId: String

    @Field(key: "date")
    var date: Date

    @OptionalField(key: "isFixedTime")
    var isFixedTime: Bool?

    @Field(key: "startTime")
    var startTime: Date

    @Field(key: "endTime")
    var endTime: Date

    @Field(key: "duration")
    var duration: Int

    @OptionalField(key: "fahrzeit")
    var fahrzeit: Int?

    @OptionalField(key: "isOpen")
    var isOpen: Bool?

    @OptionalField(key: "openedAt")
    var openedAt: Date?

    @OptionalField(key: "closedAt")
    var closedAt: Date?

    @OptionalField(key: "latitude")
    var latitude: Double?

    @OptionalField(key: "longitude")
    var longitude: Double?

    @Field(key: "createdAt")
    var createdAt: Date

    @OptionalField(key: "editedAt")
    var editedAt: Date?

    init() {}
}

/// Pivot table for many-to-many: appointments ↔ workers
final class AppointmentWorker: Model, @unchecked Sendable {
    static let schema = "appointment_workers"

    @ID(custom: "id", generatedBy: .database)
    var id: Int?

    @Field(key: "appointmentID")
    var appointmentID: String

    @Field(key: "workerID")
    var workerID: String

    init() {}
}

/// Pivot table for many-to-many: appointments ↔ services
final class AppointmentService: Model, @unchecked Sendable {
    static let schema = "appointment_services"

    @ID(custom: "id", generatedBy: .database)
    var id: Int?

    @Field(key: "appointmentID")
    var appointmentID: String

    @Field(key: "serviceID")
    var serviceID: String

    init() {}
}
