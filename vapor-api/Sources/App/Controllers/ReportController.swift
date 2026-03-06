import Vapor
import Fluent
import FluentPostgresDriver

/// CRUD controller for reports: GET/POST/PUT/DELETE /api/scheduling/reports and /api/reports
/// Handles reports with their associated photos.
struct ReportController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        // We already have SchedulingReportController for GET/POST /api/scheduling/reports
        // Let's implement the specific report endpoints /api/reports/... here
        let reports = routes.grouped("reports")
        reports.get(use: index)
        reports.post(use: create)
        reports.post("save", use: save)
        
        let reportIdGroup = reports.grouped(":reportId")
        reportIdGroup.get(use: getOne)
        reportIdGroup.put(use: update)
        reportIdGroup.patch(use: patch)  // Add PATCH endpoint
        reportIdGroup.delete(use: remove)
        
        let photoGroup = reports.grouped("photos", ":photoId")
        photoGroup.delete(use: removePhoto)
    }

    // GET /api/reports -> same as SchedulingReportController.index
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let db = req.db as! any SQLDatabase
        let rows = try await db.raw("""
            SELECT r.*,
                   COALESCE(
                     json_agg(json_build_object(
                       'photoID', rp."photoID", 'url', rp."url", 'note', rp."note"
                     )) FILTER (WHERE rp."photoID" IS NOT NULL), '[]'
                   ) AS photos
            FROM reports r
            LEFT JOIN report_photos rp ON r."reportID" = rp."reportID"
            WHERE r."firmaID" = \(bind: firmaID)
            GROUP BY r."reportID"
            """).all()

        struct ReportOutDTO: Content {
            var id: String; var firmaID: String; var type: Int
            var workerId: String; var appointmentId: String; var notes: String?
            var date: Date?; var openAt: Date?; var closeAt: Date?
            var openLatitude: Double?; var openLongitude: Double?; var openAddress: String?
            var openDistanceToAppointment: Int?
            var closeLatitude: Double?; var closeLongitude: Double?; var closeAddress: String?
            var closeDistanceToAppointment: Int?
            var photos: AnyCodable?
        }

        var reportsOut: [ReportOutDTO] = []
        for row in rows {
            reportsOut.append(ReportOutDTO(
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

        return try await ["reports": reportsOut].encodeResponse(for: req)
    }
    // POST /api/reports — create a new report
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 || user.status == 1 else { throw Abort(.forbidden) }
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
        report.openAt = Date()  // Set server timestamp
        report.openLatitude = body.openLatitude
        report.openLongitude = body.openLongitude
        report.openAddress = body.openAddress
        report.openDistanceToAppointment = body.openDistanceToAppointment
        try await report.save(on: req.db)

        struct CreateReportResponse: Content {
            var reportID: String
            var firmaID: String
            var workerId: String
            var appointmentId: String
            var type: Int
            var openAt: Date?
        }
        
        let out = CreateReportResponse(
            reportID: report.id!,
            firmaID: report.firmaID,
            workerId: report.workerId,
            appointmentId: report.appointmentId,
            type: report.type,
            openAt: report.openAt
        )

        pgNotify(req: req, firmaID: firmaID, type: "report_created")
        return try await ["report": out].encodeResponse(status: .ok, for: req)
    }
    // GET /api/reports/:reportId
    func getOne(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let reportId = req.parameters.get("reportId") else { throw Abort(.badRequest) }

        // Fetch report
        guard let report = try await Report.query(on: req.db)
            .filter(\.$id == reportId)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound)
        }
        
        // Fetch photos
        let photos = try await ReportPhoto.query(on: req.db)
            .filter(\.$report.$id == reportId)
            .all()

        struct ReportOneDTO: Content {
            var report: Report
            var photos: [ReportPhoto]
        }
        
        return try await ReportOneDTO(report: report, photos: photos).encodeResponse(for: req)
    }

    // PATCH /api/reports/:reportId - Partial update (geolocation, notes, etc.)
    func patch(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let reportId = req.parameters.get("reportId") else { throw Abort(.badRequest) }

        struct Body: Content {
            var close: Bool?
            var openLatitude: Double?; var openLongitude: Double?
            var openAddress: String?; var openDistanceToAppointment: Int?
            var closeLatitude: Double?; var closeLongitude: Double?
            var closeAddress: String?; var closeDistanceToAppointment: Int?
            var notes: String?
        }
        let body = try req.content.decode(Body.self)

        guard let report = try await Report.query(on: req.db)
            .filter(\.$id == reportId)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound)
        }

        // Update open geolocation
        if let v = body.openLatitude { report.openLatitude = v }
        if let v = body.openLongitude { report.openLongitude = v }
        if let v = body.openAddress { report.openAddress = v }
        if let v = body.openDistanceToAppointment { report.openDistanceToAppointment = v }

        // Update close geolocation
        if let v = body.closeLatitude { report.closeLatitude = v }
        if let v = body.closeLongitude { report.closeLongitude = v }
        if let v = body.closeAddress { report.closeAddress = v }
        if let v = body.closeDistanceToAppointment { report.closeDistanceToAppointment = v }

        // Update notes
        if let v = body.notes { report.notes = v }

        // Close report if requested
        if body.close == true && report.closeAt == nil {
            report.closeAt = Date()
        }

        try await report.save(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "report_updated")

        struct PatchResponse: Content {
            var report: Report
        }
        return try await PatchResponse(report: report).encodeResponse(for: req)
    }

    // PUT /api/reports/:reportId
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let reportId = req.parameters.get("reportId") else { throw Abort(.badRequest) }

        struct Body: Content {
            var closeLatitude: Double?; var closeLongitude: Double?
            var closeAddress: String?; var closeDistanceToAppointment: Int?
            var notes: String?
        }
        let body = try req.content.decode(Body.self)

        guard let report = try await Report.query(on: req.db)
            .filter(\.$id == reportId)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound)
        }

        if let v = body.closeLatitude { report.closeLatitude = v }
        if let v = body.closeLongitude { report.closeLongitude = v }
        if let v = body.closeAddress { report.closeAddress = v }
        if let v = body.closeDistanceToAppointment { report.closeDistanceToAppointment = v }
        if let v = body.notes { report.notes = v }
        report.closeAt = Date()

        try await report.save(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "report_updated")
        
        return try await report.encodeResponse(for: req)
    }

    // DELETE /api/reports/:reportId
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let reportId = req.parameters.get("reportId") else { throw Abort(.badRequest) }

        guard let report = try await Report.query(on: req.db)
            .filter(\.$id == reportId)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound)
        }

        try await report.delete(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "report_deleted")
        return try await ["success": true].encodeResponse(for: req)
    }

    // DELETE /api/reports/photos/:photoId
    func removePhoto(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let photoId = req.parameters.get("photoId") else { throw Abort(.badRequest) }

        guard let photo = try await ReportPhoto.query(on: req.db)
            .filter(\.$id == photoId)
            .with(\.$report)
            .first() else {
            throw Abort(.notFound)
        }

        guard photo.report.firmaID == firmaID else { throw Abort(.forbidden) }
        try await photo.delete(on: req.db)
        
        // Return 204 No Content
        return Response(status: .noContent)
    }

    // POST /api/reports/save
    // Used to move a photo from a temporary URL to a permanent URL and save it to the DB
    func save(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct PhotoData: Content {
            var id: String
            var url: String
            var note: String?
        }
        struct SaveBody: Content {
            var reportId: String
            var photo: PhotoData
        }
        let body = try req.content.decode(SaveBody.self)

        // Verify report exists to ensure the caller has permission to save photos to it
        guard let _ = try await Report.query(on: req.db)
            .filter(\.$id == body.reportId)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Report not found")
        }
        
        // 2. Save photo record to DB
        let photo = ReportPhoto()
        photo.id = body.photo.id
        photo.$report.id = body.reportId
        photo.url = body.photo.url
        photo.note = body.photo.note
        try await photo.save(on: req.db)

        struct ResponseData: Content {
            var photo: PhotoData
        }
        return try await ResponseData(photo: PhotoData(id: photo.id!, url: photo.url, note: photo.note)).encodeResponse(for: req)
    }
}
