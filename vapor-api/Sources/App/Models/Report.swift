import Vapor
import Fluent
import struct Foundation.Date

/// Fluent model mapping to the existing `reports` table.
final class Report: Model, @unchecked Sendable, Content {
    static let schema = "reports"

    @ID(custom: "reportID", generatedBy: .user)
    var id: String?

    @Field(key: "firmaID")
    var firmaID: String

    @Field(key: "workerId")
    var workerId: String

    @Field(key: "appointmentId")
    var appointmentId: String

    @OptionalField(key: "notes")
    var notes: String?

    @OptionalField(key: "date")
    var date: Date?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    @OptionalField(key: "openAt")
    var openAt: Date?

    @OptionalField(key: "closeAt")
    var closeAt: Date?

    @OptionalField(key: "openLatitude")
    var openLatitude: Double?

    @OptionalField(key: "openLongitude")
    var openLongitude: Double?

    @OptionalField(key: "openAddress")
    var openAddress: String?

    @OptionalField(key: "openDistanceToAppointment")
    var openDistanceToAppointment: Int?

    @OptionalField(key: "closeLatitude")
    var closeLatitude: Double?

    @OptionalField(key: "closeLongitude")
    var closeLongitude: Double?

    @OptionalField(key: "closeAddress")
    var closeAddress: String?

    @OptionalField(key: "closeDistanceToAppointment")
    var closeDistanceToAppointment: Int?

    @Field(key: "type")
    var type: Int

    @Children(for: \.$report)
    var photos: [ReportPhoto]

    init() {}
}

/// Fluent model mapping to the existing `report_photos` table.
final class ReportPhoto: Model, @unchecked Sendable, Content {
    static let schema = "report_photos"

    @ID(custom: "photoID", generatedBy: .user)
    var id: String?

    @Parent(key: "reportID")
    var report: Report

    @Field(key: "url")
    var url: String

    @OptionalField(key: "note")
    var note: String?

    @OptionalField(key: "createdAt")
    var createdAt: Date?

    init() {}
}
