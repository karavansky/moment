import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for scheduling reports: GET/POST /api/scheduling/reports
struct SchedulingReportController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let reports = routes.grouped("scheduling", "reports")
        reports.get(use: index)
        reports.post(use: create)
    }

    // GET /api/scheduling/reports — lightweight, returns only reports with photos
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let db = req.db as! any SQLDatabase
        let rows = try await db.raw("""
            SELECT r.*,
                   COALESCE(
                     json_agg(json_build_object(
                       'id', rp."photoID", 'url', rp."url", 'note', rp."note"
                     )) FILTER (WHERE rp."photoID" IS NOT NULL), '[]'
                   ) AS photos
            FROM reports r
            LEFT JOIN report_photos rp ON r."reportID" = rp."reportID"
            WHERE r."firmaID" = \(bind: firmaID)
            GROUP BY r."reportID"
            """).all()

        struct ReportDTO: Content {
            var id: String; var firmaID: String; var type: Int
            var workerId: String; var appointmentId: String; var notes: String?
            var date: Date?; var openAt: Date?; var closeAt: Date?
            var openLatitude: Double?; var openLongitude: Double?; var openAddress: String?
            var openDistanceToAppointment: Int?
            var closeLatitude: Double?; var closeLongitude: Double?; var closeAddress: String?
            var closeDistanceToAppointment: Int?
            var photos: AnyCodable?
        }

        var reports: [ReportDTO] = []
        for row in rows {
            reports.append(ReportDTO(
                id: try row.decode(column: "reportID", as: String.self),
                firmaID: try row.decode(column: "firmaID", as: String.self),
                type: (try? row.decode(column: "type", as: Int.self)) ?? 0,
                workerId: try row.decode(column: "workerId", as: String.self),
                appointmentId: try row.decode(column: "appointmentId", as: String.self),
                notes: try? row.decode(column: "notes", as: String?.self),
                date: try? row.decode(column: "date", as: Date?.self),
                openAt: try? row.decode(column: "openAt", as: Date?.self),
                closeAt: try? row.decode(column: "closeAt", as: Date?.self),
                openLatitude: try? row.decode(column: "openLatitude", as: Double?.self),
                openLongitude: try? row.decode(column: "openLongitude", as: Double?.self),
                openAddress: try? row.decode(column: "openAddress", as: String?.self),
                openDistanceToAppointment: try? row.decode(column: "openDistanceToAppointment", as: Int?.self),
                closeLatitude: try? row.decode(column: "closeLatitude", as: Double?.self),
                closeLongitude: try? row.decode(column: "closeLongitude", as: Double?.self),
                closeAddress: try? row.decode(column: "closeAddress", as: String?.self),
                closeDistanceToAppointment: try? row.decode(column: "closeDistanceToAppointment", as: Int?.self),
                photos: try? row.decode(column: "photos", as: AnyCodable?.self)
            ))
        }

        return try await ["reports": reports].encodeResponse(for: req)
    }

    // POST /api/scheduling/reports — create a new report
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var reportID: String?; var type: Int?
            var workerId: String; var appointmentId: String
            var notes: String?; var openLatitude: Double?; var openLongitude: Double?
            var openAddress: String?; var openDistanceToAppointment: Int?
        }
        let body = try req.content.decode(Body.self)

        let report = Report()
        report.id = body.reportID ?? generateId()
        report.firmaID = firmaID
        report.workerId = body.workerId
        report.appointmentId = body.appointmentId
        report.type = body.type ?? 0
        report.notes = body.notes
        report.openLatitude = body.openLatitude
        report.openLongitude = body.openLongitude
        report.openAddress = body.openAddress
        report.openDistanceToAppointment = body.openDistanceToAppointment
        try await report.save(on: req.db)

        pgNotify(req: req, firmaID: firmaID, type: "report_created")
        return try await report.encodeResponse(status: .ok, for: req)
    }
}
