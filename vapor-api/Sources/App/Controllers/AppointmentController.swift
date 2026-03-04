import Vapor
import Fluent
import FluentPostgresDriver

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

        return try await ["appointments": appointments].encodeResponse(for: req)
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

            try await sqlDB.raw("""
                INSERT INTO appointments (
                    "appointmentID", "firmaID", "userID", "clientID", "workerId",
                    "date", "isFixedTime", "startTime", "endTime", "duration", "fahrzeit",
                    "latitude", "longitude"
                )
                VALUES (
                    \(bind: appointmentID), \(bind: firmaID), \(bind: user.userId),
                    \(bind: body.clientID), \(bind: primaryWorkerId),
                    \(bind: body.date)::timestamptz, \(bind: body.isFixedTime ?? false),
                    \(bind: body.startTime)::timestamptz, \(bind: body.endTime)::timestamptz,
                    \(bind: body.duration), \(bind: body.fahrzeit ?? 0),
                    \(bind: body.latitude), \(bind: body.longitude)
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

        pgNotify(req: req, firmaID: firmaID, type: "appointment_created")

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
            if let v = body.openedAt { appointment.openedAt = ISO8601DateFormatter().date(from: v) }
            if let v = body.closedAt { appointment.closedAt = ISO8601DateFormatter().date(from: v) }

            // Check at least one field was provided
            guard body.isOpen != nil || body.openedAt != nil || body.closedAt != nil else {
                throw Abort(.badRequest, reason: "No allowed fields to update")
            }

            try await appointment.save(on: req.db)
            pgNotify(req: req, firmaID: firmaID, type: "appointment_updated")
            return try await appointment.encodeResponse(for: req)
        }

        // Director: full update
        try await req.db.transaction { database in
            let sqlDB = database as! any SQLDatabase

            if let v = body.date { appointment.date = ISO8601DateFormatter().date(from: v) ?? appointment.date }
            if let v = body.isFixedTime { appointment.isFixedTime = v }
            if let v = body.startTime { appointment.startTime = ISO8601DateFormatter().date(from: v) ?? appointment.startTime }
            if let v = body.endTime { appointment.endTime = ISO8601DateFormatter().date(from: v) ?? appointment.endTime }
            if let v = body.duration { appointment.duration = v }
            if let v = body.fahrzeit { appointment.fahrzeit = v }
            if let v = body.clientID { appointment.clientID = v }
            if let v = body.isOpen { appointment.isOpen = v }
            if let v = body.openedAt { appointment.openedAt = ISO8601DateFormatter().date(from: v) }
            if let v = body.closedAt { appointment.closedAt = ISO8601DateFormatter().date(from: v) }
            if body.latitude != nil { appointment.latitude = body.latitude }
            if body.longitude != nil { appointment.longitude = body.longitude }
            if let wids = body.workerIds, let first = wids.first {
                appointment.workerId = first
            }

            try await appointment.save(on: database)

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

        pgNotify(req: req, firmaID: firmaID, type: "appointment_updated")
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

        try await appointment.delete(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "appointment_deleted")
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
