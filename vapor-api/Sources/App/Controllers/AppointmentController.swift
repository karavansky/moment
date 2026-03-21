import Vapor
import Fluent
import FluentPostgresDriver

/// Parse ISO8601 dates that may include fractional seconds (JS sends '2024-01-01T12:00:00.000Z')
/// The default ISO8601DateFormatter does NOT support fractional seconds out of the box.
private func isoDate(_ s: String) -> Date? {
    // 1. Full ISO8601 with fractional seconds
    let withMs = ISO8601DateFormatter()
    withMs.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
    if let d = withMs.date(from: s) { return d }

    // 2. Standard ISO8601
    let plain = ISO8601DateFormatter()
    plain.formatOptions = [.withInternetDateTime]
    if let d = plain.date(from: s) { return d }

    // 3. Simple date string (YYYY-MM-DD) from Next.js date pickers
    let simple = DateFormatter()
    simple.dateFormat = "yyyy-MM-dd"
    simple.timeZone = TimeZone(secondsFromGMT: 0) // Treat as UTC midnight
    return simple.date(from: s)
}

/// CRUD controller for appointments: GET/POST/PUT/DELETE /api/scheduling/appointments
/// Implements role-based access control:
///   - Director (status=0/nil): full CRUD
///   - Worker (status=1): GET (filtered), PUT (only isOpen/openedAt/closedAt)
///   - Client (status=2): GET only (filtered)
struct AppointmentController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let appointments = routes.grouped("scheduling", "appointments")
        appointments.get(use: index)
        appointments.post(use: create)
        appointments.put(use: update)
        appointments.delete(use: remove)
    }

    // MARK: - GET /api/scheduling/appointments
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let db = req.db as! any SQLDatabase

        // Fetch all appointments with joined data (same complex SQL as Next.js)
        let rows = try await db.raw("""
            SELECT
              a.*,
              json_build_object(
                'id', c."clientID", 'name', c."name", 'surname', c."surname",
                'email', c."email", 'phone', c."phone", 'phone2', c."phone2",
                'country', c."country", 'street', c."street", 'postalCode', c."postalCode",
                'city', c."city", 'houseNumber', c."houseNumber", 'apartment', c."apartment",
                'district', c."district", 'latitude', c."latitude", 'longitude', c."longitude",
                'status', c."status", 'firmaID', c."firmaID"
              ) AS client,
              COALESCE(
                (
                  SELECT json_agg(
                    json_build_object(
                      'id', w2."workerID", 'name', w2."name", 'surname', w2."surname",
                      'email', w2."email", 'firmaID', w2."firmaID", 'teamId', w2."teamId",
                      'status', w2."status"
                    )
                  )
                  FROM appointment_workers aw2
                  JOIN workers w2 ON aw2."workerID" = w2."workerID"
                  WHERE aw2."appointmentID" = a."appointmentID"
                ),
                '[]'
              ) AS workers_data,
              COALESCE(
                (
                  SELECT array_agg(aw3."workerID")
                  FROM appointment_workers aw3
                  WHERE aw3."appointmentID" = a."appointmentID"
                ),
                ARRAY[]::VARCHAR[]
              ) AS "workerIds",
              COALESCE(
                json_agg(
                  json_build_object(
                    'id', s."serviceID", 'name', s."name", 'duration', s."duration",
                    'price', s."price", 'parentId', s."parentId", 'isGroup', s."isGroup",
                    'firmaID', s."firmaID", 'order', s."order"
                  )
                ) FILTER (WHERE s."serviceID" IS NOT NULL),
                '[]'
              ) AS services
            FROM appointments a
            JOIN clients c ON a."clientID" = c."clientID"
            LEFT JOIN appointment_services aps ON a."appointmentID" = aps."appointmentID"
            LEFT JOIN services s ON aps."serviceID" = s."serviceID"
            WHERE a."firmaID" = \(bind: firmaID)
            GROUP BY a."appointmentID", c."clientID"
            ORDER BY a."date", a."startTime"
            """).all()

        // Decode rows to JSON-compatible dictionaries
        var appointments = try rows.map { row -> AppointmentDTO in
            try decodeAppointmentRow(row)
        }

        // Role-based filtering
        let userStatus = user.status
        if userStatus == 1 {
            // Worker: only appointments where they are in workerIds
            let myWorker = try await Worker.query(on: req.db)
                .filter(\.$userID == user.userId)
                .filter(\.$firmaID == firmaID)
                .first()
            if let worker = myWorker {
                appointments = appointments.filter { $0.workerIds.contains(worker.id ?? "") }
            } else {
                appointments = []
            }
        } else if userStatus == 2 {
            // Client: only their own appointments
            let myClient = try await Client.query(on: req.db)
                .filter(\.$userID == user.userId)
                .filter(\.$firmaID == firmaID)
                .first()
            if let client = myClient {
                appointments = appointments.filter { $0.clientID == client.id }
            } else {
                appointments = []
            }
        }

        // Fetch reports with photos
        let reportsRows = try await db.raw("""
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

        // Map reports
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

        var reportsDTO: [ReportOutDTO] = []
        for row in reportsRows {
            reportsDTO.append(ReportOutDTO(
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

        // Attach reports to each appointment
        struct AppointmentWithReports: Content {
            let appointment: AppointmentDTO
            let reports: [ReportOutDTO]
        }

        let appointmentsWithReports = appointments.map { apt in
            let aptReports = reportsDTO.filter { $0.appointmentId == apt.id }
            return AppointmentWithReports(appointment: apt, reports: aptReports)
        }

        // Convert to JSON response manually to flatten the structure
        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601

        var appointmentsJSON: [[String: Any]] = []
        for item in appointmentsWithReports {
            // Encode appointment
            let aptData = try encoder.encode(item.appointment)
            var aptDict = try JSONSerialization.jsonObject(with: aptData) as! [String: Any]

            // Encode reports
            let reportsData = try encoder.encode(item.reports)
            let reportsArray = try JSONSerialization.jsonObject(with: reportsData) as! [[String: Any]]

            // Merge
            aptDict["reports"] = reportsArray
            appointmentsJSON.append(aptDict)
        }

        let response = try JSONSerialization.data(withJSONObject: ["appointments": appointmentsJSON])
        return Response(status: .ok, headers: ["Content-Type": "application/json"], body: .init(data: response))
    }

    // MARK: - POST /api/scheduling/appointments
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var clientID: String
            var workerIds: [String]
            var date: String
            var isFixedTime: Bool?
            var startTime: String
            var endTime: String
            var duration: Int
            var fahrzeit: Int?
            var latitude: Double?
            var longitude: Double?
            var serviceIds: [String]?
        }
        let body = try req.content.decode(Body.self)

        let appointmentID = generateId()
        let primaryWorkerId = body.workerIds.first ?? ""
        let _ = req.db as! any SQLDatabase

        // Transaction: create appointment + pivot tables
        try await req.db.transaction { database in
            let sqlDB = database as! any SQLDatabase

            let createdAt = Date()

            try await sqlDB.raw("""
                INSERT INTO appointments (
                    "appointmentID", "firmaID", "userID", "clientID", "workerId",
                    "date", "isFixedTime", "startTime", "endTime", "duration", "fahrzeit",
                    "latitude", "longitude", "createdAt"
                )
                VALUES (
                    \(bind: appointmentID), \(bind: firmaID), \(bind: user.userId),
                    \(bind: body.clientID), \(bind: primaryWorkerId),
                    \(bind: body.date)::timestamptz, \(bind: body.isFixedTime ?? false),
                    \(bind: body.startTime)::timestamptz, \(bind: body.endTime)::timestamptz,
                    \(bind: body.duration), \(bind: body.fahrzeit ?? 0),
                    \(bind: body.latitude), \(bind: body.longitude), \(bind: createdAt)
                )
                """).run()

            // Insert appointment_workers
            for workerID in body.workerIds {
                try await sqlDB.raw("""
                    INSERT INTO appointment_workers ("appointmentID", "workerID")
                    VALUES (\(bind: appointmentID), \(bind: workerID))
                    """).run()
            }

            // Insert appointment_services
            for serviceID in (body.serviceIds ?? []) {
                try await sqlDB.raw("""
                    INSERT INTO appointment_services ("appointmentID", "serviceID")
                    VALUES (\(bind: appointmentID), \(bind: serviceID))
                    """).run()
            }
        }

        // Send SSE notification with full payload
        notifyAppointmentChange(
            req: req,
            firmaID: firmaID,
            type: "appointment_created",
            appointmentID: appointmentID,
            workerIds: body.workerIds,
            clientID: body.clientID
        )

        // Send push notification to workers
        sendPushNotification(
            req: req,
            type: "workers",
            workerIds: body.workerIds,
            title: "New Appointment",
            body: "You have been assigned to a new appointment.",
            url: "/dienstplan",
            tag: "appointment-\(appointmentID)"
        )

        // Return the created appointment
        let created = try await Appointment.query(on: req.db)
            .filter(\.$id == appointmentID)
            .first()
        return try await (created ?? Appointment()).encodeResponse(status: .ok, for: req)
    }

    // MARK: - PUT /api/scheduling/appointments
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Client cannot update
        if user.status == 2 {
            throw Abort(.forbidden, reason: "Forbidden")
        }

        struct Body: Content {
            var id: String
            var date: String?; var isFixedTime: Bool?
            var startTime: String?; var endTime: String?
            var duration: Int?; var fahrzeit: Int?
            var workerIds: [String]?; var clientID: String?
            var isOpen: Bool?; var openedAt: String?; var closedAt: String?
            var latitude: Double?; var longitude: Double?
            var serviceIds: [String]?
        }
        let body = try req.content.decode(Body.self)

        // Verify appointment exists
        guard let appointment = try await Appointment.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Appointment not found")
        }

        // Worker (status=1): can only update isOpen/openedAt/closedAt
        if user.status == 1 {
            let myWorker = try await Worker.query(on: req.db)
                .filter(\.$userID == user.userId)
                .filter(\.$firmaID == firmaID)
                .first()
            guard myWorker != nil else {
                throw Abort(.notFound, reason: "Worker not found")
            }

            if let v = body.isOpen { appointment.isOpen = v }
            if let v = body.openedAt { appointment.openedAt = isoDate(v) }
            if let v = body.closedAt { appointment.closedAt = isoDate(v) }

            // Check at least one field was provided
            guard body.isOpen != nil || body.openedAt != nil || body.closedAt != nil else {
                throw Abort(.badRequest, reason: "No allowed fields to update")
            }

            // Set editedAt timestamp
            appointment.editedAt = Date()

            try await appointment.save(on: req.db)

            // Fetch workerIds for notification
            let db = req.db as! any SQLDatabase
            let workerRows = try await db.raw("""
                SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = \(bind: body.id)
                """).all()
            let workerIds = try workerRows.map { try $0.decode(column: "workerID", as: String.self) }

            notifyAppointmentChange(
                req: req,
                firmaID: firmaID,
                type: "appointment_updated",
                appointmentID: body.id,
                workerIds: workerIds,
                clientID: appointment.clientID,
                isOpen: appointment.isOpen,
                openedAt: appointment.openedAt,
                closedAt: appointment.closedAt
            )

            // Push to directors when appointment opens/closes
            if let isOpen = body.isOpen {
                if isOpen {
                    sendPushNotification(
                        req: req,
                        type: "directors",
                        firmaID: firmaID,
                        title: "Appointment Started",
                        body: "A worker started an appointment.",
                        url: "/dispatcher/\(body.id)",
                        tag: "appointment-open-\(body.id)"
                    )
                } else {
                    sendPushNotification(
                        req: req,
                        type: "directors",
                        firmaID: firmaID,
                        title: "Appointment Finished",
                        body: "A worker finished an appointment.",
                        url: "/dienstplan",
                        tag: "appointment-close-\(body.id)"
                    )
                }
            }

            return try await appointment.encodeResponse(for: req)
        }

        // Director: full update
        try await req.db.transaction { database in
            let sqlDB = database as! any SQLDatabase

            req.logger.info("--- PUT /appointments DEBUG ---")
            req.logger.info("Payload id: \(body.id)")
            req.logger.info("Payload date: \(String(describing: body.date))")
            req.logger.info("Payload startTime: \(String(describing: body.startTime))")

            // Re-fetch inside transaction to ensure we're updating within the same connection
            guard let appt = try await Appointment.query(on: database)
                .filter(\.$id == body.id)
                .filter(\.$firmaID == firmaID)
                .first() else {
                req.logger.error("Appointment not found in transaction: \(body.id)")
                throw Abort(.notFound, reason: "Appointment not found in transaction")
            }

            req.logger.info("Before Save -> Appt date: \(appt.date), startTime: \(appt.startTime)")

            if let v = body.date {
                if let parsed = isoDate(v) {
                    req.logger.info("Parsed date valid: \(parsed)")
                    appt.date = parsed
                } else {
                    req.logger.warning("isoDate failed to parse date string: \(v)")
                }
            }
            if let v = body.isFixedTime { appt.isFixedTime = v }
            if let v = body.startTime {
                if let parsed = isoDate(v) {
                    req.logger.info("Parsed startTime valid: \(parsed)")
                    appt.startTime = parsed
                } else {
                    req.logger.warning("isoDate failed to parse startTime string: \(v)")
                }
            }
            if let v = body.endTime {
                if let parsed = isoDate(v) {
                    appt.endTime = parsed
                } else {
                    req.logger.warning("isoDate failed to parse endTime string: \(v)")
                }
            }
            if let v = body.duration { appt.duration = v }
            if let v = body.fahrzeit { appt.fahrzeit = v }
            if let v = body.clientID { appt.clientID = v }
            if let v = body.isOpen { appt.isOpen = v }
            if let v = body.openedAt { appt.openedAt = isoDate(v) }
            if let v = body.closedAt { appt.closedAt = isoDate(v) }
            if body.latitude != nil { appt.latitude = body.latitude }
            if body.longitude != nil { appt.longitude = body.longitude }
            if let wids = body.workerIds, let first = wids.first {
                appt.workerId = first
            }

            // Set editedAt timestamp
            appt.editedAt = Date()

            req.logger.info("After modifications -> Appt date: \(appt.date), startTime: \(appt.startTime)")
            req.logger.info("Appt hasChanges: \(appt.hasChanges)")

            try await appt.save(on: database)
            req.logger.info("Appt saved via Fluent")

            // Update appointment_workers if provided
            if let workerIds = body.workerIds {
                try await sqlDB.raw("""
                    DELETE FROM appointment_workers WHERE "appointmentID" = \(bind: body.id)
                    """).run()
                for wid in workerIds {
                    try await sqlDB.raw("""
                        INSERT INTO appointment_workers ("appointmentID", "workerID")
                        VALUES (\(bind: body.id), \(bind: wid))
                        """).run()
                }
            }

            // Update appointment_services if provided
            if let serviceIds = body.serviceIds {
                try await sqlDB.raw("""
                    DELETE FROM appointment_services WHERE "appointmentID" = \(bind: body.id)
                    """).run()
                for sid in serviceIds {
                    try await sqlDB.raw("""
                        INSERT INTO appointment_services ("appointmentID", "serviceID")
                        VALUES (\(bind: body.id), \(bind: sid))
                        """).run()
                }
            }
        }

        // Fetch final workerIds for notification (after transaction commit)
        let db = req.db as! any SQLDatabase
        let workerRows = try await db.raw("""
            SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = \(bind: body.id)
            """).all()
        let finalWorkerIds = try workerRows.map { try $0.decode(column: "workerID", as: String.self) }

        notifyAppointmentChange(
            req: req,
            firmaID: firmaID,
            type: "appointment_updated",
            appointmentID: body.id,
            workerIds: finalWorkerIds,
            clientID: appointment.clientID,
            isOpen: appointment.isOpen,
            openedAt: appointment.openedAt,
            closedAt: appointment.closedAt
        )

        // Check if time changed (date, startTime, or endTime)
        let timeChanged = body.date != nil || body.startTime != nil || body.endTime != nil

        if timeChanged {
            // Send push to all workers about reschedule
            sendPushNotification(
                req: req,
                type: "workers",
                workerIds: finalWorkerIds,
                title: "Appointment Time Changed",
                body: "Your appointment has been rescheduled.",
                url: "/dienstplan",
                tag: "appointment-rescheduled-\(body.id)"
            )
        }

        // Check for worker changes (additions/removals)
        // This requires fetching the original workerIds before the update
        // For simplicity, we'll send push on ANY worker change
        if body.workerIds != nil {
            // Note: In a full implementation, we'd compare with original workerIds
            // and send different messages to added vs removed workers
            sendPushNotification(
                req: req,
                type: "workers",
                workerIds: finalWorkerIds,
                title: "Assignment Updated",
                body: "Your appointment assignment has been updated.",
                url: "/dienstplan",
                tag: "appointment-\(body.id)"
            )
        }

        return try await appointment.encodeResponse(for: req)
    }

    // MARK: - DELETE /api/scheduling/appointments
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String }
        let body = try req.content.decode(Body.self)

        guard let appointment = try await Appointment.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Appointment not found")
        }

        // Fetch workerIds BEFORE deletion
        let db = req.db as! any SQLDatabase
        let workerRows = try await db.raw("""
            SELECT "workerID" FROM appointment_workers WHERE "appointmentID" = \(bind: body.id)
            """).all()
        let workerIds = try workerRows.map { try $0.decode(column: "workerID", as: String.self) }
        let clientID = appointment.clientID

        try await appointment.delete(on: req.db)

        notifyAppointmentChange(
            req: req,
            firmaID: firmaID,
            type: "appointment_deleted",
            appointmentID: body.id,
            workerIds: workerIds,
            clientID: clientID
        )

        // Send push to workers about cancellation
        sendPushNotification(
            req: req,
            type: "workers",
            workerIds: workerIds,
            title: "Appointment Cancelled",
            body: "Your appointment has been cancelled.",
            url: "/dienstplan",
            tag: "appointment-\(body.id)"
        )

        return try await ["success": true].encodeResponse(for: req)
    }
}

// MARK: - DTO for appointment rows from complex SQL

struct AppointmentDTO: Content {
    var id: String
    var firmaID: String
    var userID: String
    var clientID: String
    var workerId: String
    var workerIds: [String]
    var date: String?
    var isFixedTime: Bool?
    var startTime: Date?
    var endTime: Date?
    var duration: Int
    var fahrzeit: Int?
    var isOpen: Bool?
    var openedAt: Date?
    var closedAt: Date?
    var latitude: Double?
    var longitude: Double?
    var createdAt: Date
    var editedAt: Date?
    var services: AnyCodable?
    var worker: AnyCodable?
    var client: AnyCodable?
}

/// Decode a raw SQL row into AppointmentDTO
func decodeAppointmentRow(_ row: any SQLRow) throws -> AppointmentDTO {
    let dateVal = (try? row.decode(column: "date", as: Date?.self))?.flatMap { $0 }
    let dateStr: String?
    if let d = dateVal {
        let formatter = DateFormatter()
        formatter.dateFormat = "yyyy-MM-dd"
        formatter.timeZone = TimeZone(identifier: "UTC")
        dateStr = formatter.string(from: d)
    } else {
        dateStr = nil
    }

    return AppointmentDTO(
        id: try row.decode(column: "appointmentID", as: String.self),
        firmaID: try row.decode(column: "firmaID", as: String.self),
        userID: try row.decode(column: "userID", as: String.self),
        clientID: try row.decode(column: "clientID", as: String.self),
        workerId: try row.decode(column: "workerId", as: String.self),
        workerIds: (try? row.decode(column: "workerIds", as: [String].self)) ?? [],
        date: dateStr,
        isFixedTime: try? row.decode(column: "isFixedTime", as: Bool?.self),
        startTime: try? row.decode(column: "startTime", as: Date?.self),
        endTime: try? row.decode(column: "endTime", as: Date?.self),
        duration: (try? row.decode(column: "duration", as: Int.self)) ?? 0,
        fahrzeit: try? row.decode(column: "fahrzeit", as: Int?.self),
        isOpen: try? row.decode(column: "isOpen", as: Bool?.self),
        openedAt: try? row.decode(column: "openedAt", as: Date?.self),
        closedAt: try? row.decode(column: "closedAt", as: Date?.self),
        latitude: try? row.decode(column: "latitude", as: Double?.self),
        longitude: try? row.decode(column: "longitude", as: Double?.self),
        createdAt: (try? row.decode(column: "createdAt", as: Date.self)) ?? Date(),
        editedAt: try? row.decode(column: "editedAt", as: Date?.self),
        services: try? row.decode(column: "services", as: AnyCodable?.self),
        worker: try? row.decode(column: "workers_data", as: AnyCodable?.self),
        client: try? row.decode(column: "client", as: AnyCodable?.self)
    )
}

/// Type-erased Codable wrapper for JSON columns (json_agg, json_build_object)
struct AnyCodable: Codable, @unchecked Sendable {
    let value: Any

    init(_ value: Any) { self.value = value }

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if let arr = try? container.decode([AnyCodable].self) {
            value = arr.map { $0.value }
        } else if let dict = try? container.decode([String: AnyCodable].self) {
            value = dict.mapValues { $0.value }
        } else if let str = try? container.decode(String.self) { value = str }
        else if let int = try? container.decode(Int.self) { value = int }
        else if let dbl = try? container.decode(Double.self) { value = dbl }
        else if let bool = try? container.decode(Bool.self) { value = bool }
        else if container.decodeNil() { value = NSNull() }
        else { throw DecodingError.dataCorruptedError(in: container, debugDescription: "Unsupported type") }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch value {
        case let arr as [Any]:
            try container.encode(arr.map { AnyCodable($0) })
        case let dict as [String: Any]:
            try container.encode(dict.mapValues { AnyCodable($0) })
        case let str as String: try container.encode(str)
        case let int as Int: try container.encode(int)
        case let dbl as Double: try container.encode(dbl)
        case let bool as Bool: try container.encode(bool)
        case is NSNull: try container.encodeNil()
        default: try container.encodeNil()
        }
    }
}

// MARK: - Helpers

/// Payload structure for push notifications
struct PushPayload: Content {
    var title: String
    var body: String
    var url: String?
    var tag: String?
}

/// Request body for internal push API
struct InternalPushRequest: Content {
    var type: String
    var workerIds: [String]?
    var firmaID: String?
    var payload: PushPayload
}

/// Send push notification via Next.js internal API (fire-and-forget)
func sendPushNotification(
    req: Request,
    type: String, // "workers" or "directors"
    workerIds: [String]? = nil,
    firmaID: String? = nil,
    title: String,
    body: String,
    url: String? = nil,
    tag: String? = nil
) {
    Task {
        do {
            // Use Docker service name for inter-container communication
            // Try to connect to moment container first (production)
            // Fall back to localhost:3002 (development)
            let nextjsUrl = Environment.get("NEXTJS_URL") ?? "http://moment:3002/api/internal/send-push"

            // Build request body
            let requestBody = InternalPushRequest(
                type: type,
                workerIds: workerIds,
                firmaID: firmaID,
                payload: PushPayload(title: title, body: body, url: url, tag: tag)
            )

            // Use Vapor's HTTP client
            let uri = URI(string: nextjsUrl)
            let response = try await req.client.post(uri) { clientReq in
                // Add internal API key for authentication
                let apiKey = Environment.get("INTERNAL_API_KEY") ?? "vapor-internal-2024"
                clientReq.headers.add(name: "X-Internal-API-Key", value: apiKey)
                try clientReq.content.encode(requestBody)
            }

            if response.status != .ok {
                req.logger.warning("Push notification API returned status \(response.status)")
            } else {
                req.logger.info("Push notification sent successfully: \(title)")
            }
        } catch {
            req.logger.error("Failed to send push notification: \(error)")
        }
    }
}

/// Send appointment pg_notify with full payload (workerIds, clientID, isOpen, etc.)
/// Matches Next.js lib/appointments.ts notifyAppointmentChange()
func notifyAppointmentChange(
    req: Request,
    firmaID: String,
    type: String,
    appointmentID: String,
    workerIds: [String],
    clientID: String,
    isOpen: Bool? = nil,
    openedAt: Date? = nil,
    closedAt: Date? = nil
) {
    let channel = "scheduling_" + firmaID.lowercased().filter { $0.isLetter || $0.isNumber || $0 == "_" }

    // Build JSON payload manually to match Next.js format
    var payloadDict: [String: Any] = [
        "type": type,
        "appointmentID": appointmentID,
        "workerIds": workerIds,
        "clientID": clientID,
        "firmaID": firmaID
    ]

    if let isOpen = isOpen {
        payloadDict["isOpen"] = isOpen
    }
    if let openedAt = openedAt {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        payloadDict["openedAt"] = formatter.string(from: openedAt)
    }
    if let closedAt = closedAt {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        payloadDict["closedAt"] = formatter.string(from: closedAt)
    }

    guard let payloadData = try? JSONSerialization.data(withJSONObject: payloadDict),
          let payload = String(data: payloadData, encoding: .utf8) else {
        req.logger.error("Failed to serialize appointment notification payload")
        return
    }

    Task {
        do {
            try await (req.db as! any SQLDatabase).raw(
                "SELECT pg_notify(\(bind: channel), \(bind: payload))"
            ).run()
            req.logger.info("pg_notify sent: \(type) for appointment \(appointmentID)")
        } catch {
            req.logger.error("pg_notify failed: \(error)")
        }
    }
}
