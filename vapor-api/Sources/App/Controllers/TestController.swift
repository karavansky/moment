import Vapor
import Fluent
import FluentPostgresDriver

/// Load testing endpoints: GET /api/test/vapor (public) and /api/test/vapor-auth (JWT protected)
struct TestController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let test = routes.grouped("test")
        test.get("vapor", use: vaporTest)
        // vapor-auth is registered separately under the protected group in routes.swift
    }

    /// Shared method — reusable for both public and protected test endpoints
    func schedulingDump(req: Request) async throws -> Response {
        let db = req.db as! any SQLDatabase

        // Parallel fetch of all data without filters
        async let teamsRaw = Team.query(on: req.db).all()
        async let groupesRaw = Groupe.query(on: req.db).all()
        async let servicesRaw = Service.query(on: req.db).all()

        async let workersRows = db.raw("""
            SELECT w.*,
                   t."teamName",
                   u."date" AS "lastLoginAt",
                   u."pushNotificationsEnabled",
                   u."geolocationEnabled",
                   u."pwaVersion",
                   u."osVersion",
                   u."batteryLevel",
                   u."batteryStatus",
                   EXISTS(SELECT 1 FROM push_subscriptions ps WHERE ps."userID" = w."userID") AS "hasPushSubscription"
            FROM workers w
            LEFT JOIN teams t ON w."teamId" = t."teamID"
            LEFT JOIN users u ON w."userID" = u."userID"
            ORDER BY w."name"
            """).all()

        async let clientsRows = db.raw("""
            SELECT c.*, g."groupeName"
            FROM clients c
            LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
            ORDER BY c."name"
            """).all()

        async let appointmentsRows = db.raw("""
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
                (SELECT json_agg(json_build_object(
                    'id', w2."workerID", 'name', w2."name", 'surname', w2."surname",
                    'email', w2."email", 'firmaID', w2."firmaID", 'teamId', w2."teamId",
                    'status', w2."status"
                ))
                FROM appointment_workers aw2
                JOIN workers w2 ON aw2."workerID" = w2."workerID"
                WHERE aw2."appointmentID" = a."appointmentID"), '[]'
              ) AS workers_data,
              COALESCE(
                (SELECT array_agg(aw3."workerID")
                FROM appointment_workers aw3
                WHERE aw3."appointmentID" = a."appointmentID"), ARRAY[]::VARCHAR[]
              ) AS "workerIds",
              COALESCE(
                json_agg(json_build_object(
                  'id', s."serviceID", 'name', s."name", 'duration', s."duration",
                  'price', s."price", 'parentId', s."parentId", 'isGroup', s."isGroup",
                  'firmaID', s."firmaID", 'order', s."order"
                )) FILTER (WHERE s."serviceID" IS NOT NULL), '[]'
              ) AS services
            FROM appointments a
            JOIN clients c ON a."clientID" = c."clientID"
            LEFT JOIN appointment_services aps ON a."appointmentID" = aps."appointmentID"
            LEFT JOIN services s ON aps."serviceID" = s."serviceID"
            GROUP BY a."appointmentID", c."clientID"
            ORDER BY a."date", a."startTime"
            """).all()

        async let reportsRows = db.raw("""
            SELECT r.*,
                   COALESCE(
                     json_agg(json_build_object(
                       'photoID', rp."photoID", 'url', rp."url", 'note', rp."note"
                     )) FILTER (WHERE rp."photoID" IS NOT NULL), '[]'
                   ) AS photos
            FROM reports r
            LEFT JOIN report_photos rp ON r."reportID" = rp."reportID"
            GROUP BY r."reportID"
            """).all()

        // Await all
        let teams = try await teamsRaw
        let groupes = try await groupesRaw
        let services = try await servicesRaw
        let wRows = try await workersRows
        let cRows = try await clientsRows
        let aRows = try await appointmentsRows
        let rRows = try await reportsRows

        // Map teams
        let teamsDTO = teams.map { t -> [String: String] in
            ["id": t.id ?? "", "teamName": t.teamName, "firmaID": t.firmaID]
        }

        // Map groupes
        let groupesDTO = groupes.map { g -> [String: String] in
            ["id": g.id ?? "", "groupeName": g.groupeName, "firmaID": g.firmaID]
        }

        // Map services
        struct ServiceOutDTO: Content {
            var id: String; var firmaID: String; var name: String
            var description: String?; var duration: Int?; var price: Double?
            var parentId: String?; var isGroup: Bool?; var order: Int?
        }
        let servicesDTO = services.map { s in
            ServiceOutDTO(id: s.id ?? "", firmaID: s.firmaID, name: s.name,
                         description: s.description, duration: s.duration,
                         price: s.price, parentId: s.parentId,
                         isGroup: s.isGroup, order: s.order)
        }

        // Map workers
        struct WorkerOutDTO: Content {
            var id: String; var userID: String?; var firmaID: String
            var name: String; var surname: String; var email: String
            var phone: String?; var phone2: String?
            var teamId: String?; var team: TeamOutDTO?
            var isAdress: Bool; var status: Int
            var country: String?; var street: String?; var postalCode: String?
            var city: String?; var houseNumber: String?; var apartment: String?
            var district: String?; var latitude: Double?; var longitude: Double?
            var lastLoginAt: String?
            var pushNotificationsEnabled: Bool?; var geolocationEnabled: Bool?
            var hasPushSubscription: Bool?; var pwaVersion: String?
            var osVersion: String?; var batteryLevel: Double?; var batteryStatus: String?
        }
        struct TeamOutDTO: Content {
            var id: String; var teamName: String; var firmaID: String
        }

        var workersDTO: [WorkerOutDTO] = []
        for row in wRows {
            let teamId = try? row.decode(column: "teamId", as: String?.self)
            let teamName = try? row.decode(column: "teamName", as: String?.self)
            let lastLogin = try? row.decode(column: "lastLoginAt", as: Date?.self)
            let wFirmaID = (try? row.decode(column: "firmaID", as: String?.self)) ?? "unknown"
            let teamDTO: TeamOutDTO? = (teamId != nil && teamName != nil) ?
                TeamOutDTO(id: teamId!, teamName: teamName!, firmaID: wFirmaID) : nil

            workersDTO.append(WorkerOutDTO(
                id: try row.decode(column: "workerID", as: String.self),
                userID: try? row.decode(column: "userID", as: String?.self),
                firmaID: wFirmaID,
                name: try row.decode(column: "name", as: String.self),
                surname: (try? row.decode(column: "surname", as: String?.self)) ?? "",
                email: (try? row.decode(column: "email", as: String?.self)) ?? "",
                phone: try? row.decode(column: "phone", as: String?.self),
                phone2: try? row.decode(column: "phone2", as: String?.self),
                teamId: teamId ?? nil,
                team: teamDTO,
                isAdress: (try? row.decode(column: "isAdress", as: Bool.self)) ?? false,
                status: (try? row.decode(column: "status", as: Int.self)) ?? 0,
                country: try? row.decode(column: "country", as: String?.self),
                street: try? row.decode(column: "street", as: String?.self),
                postalCode: try? row.decode(column: "postalCode", as: String?.self),
                city: try? row.decode(column: "city", as: String?.self),
                houseNumber: try? row.decode(column: "houseNumber", as: String?.self),
                apartment: try? row.decode(column: "apartment", as: String?.self),
                district: try? row.decode(column: "district", as: String?.self),
                latitude: try? row.decode(column: "latitude", as: Double?.self),
                longitude: try? row.decode(column: "longitude", as: Double?.self),
                lastLoginAt: lastLogin?.iso8601String,
                pushNotificationsEnabled: try? row.decode(column: "pushNotificationsEnabled", as: Bool?.self),
                geolocationEnabled: try? row.decode(column: "geolocationEnabled", as: Bool?.self),
                hasPushSubscription: try? row.decode(column: "hasPushSubscription", as: Bool?.self),
                pwaVersion: try? row.decode(column: "pwaVersion", as: String?.self),
                osVersion: try? row.decode(column: "osVersion", as: String?.self),
                batteryLevel: try? row.decode(column: "batteryLevel", as: Double?.self),
                batteryStatus: try? row.decode(column: "batteryStatus", as: String?.self)
            ))
        }

        // Map clients
        struct ClientOutDTO: Content {
            var id: String; var firmaID: String
            var name: String; var surname: String; var email: String?
            var phone: String?; var phone2: String?; var status: Int
            var country: String; var street: String; var postalCode: String
            var city: String; var houseNumber: String; var apartment: String?
            var district: String?; var latitude: Double; var longitude: Double
            var groupe: GroupeOutDTO?
        }
        struct GroupeOutDTO: Content {
            var id: String; var groupeName: String; var firmaID: String
        }

        var clientsDTO: [ClientOutDTO] = []
        for row in cRows {
            let groupeID = try? row.decode(column: "groupeID", as: String?.self)
            let groupeName = try? row.decode(column: "groupeName", as: String?.self)
            let cFirmaID = (try? row.decode(column: "firmaID", as: String?.self)) ?? "unknown"
            let groupeDTO: GroupeOutDTO? = (groupeID != nil && groupeName != nil) ?
                GroupeOutDTO(id: groupeID!, groupeName: groupeName!, firmaID: cFirmaID) : nil

            clientsDTO.append(ClientOutDTO(
                id: try row.decode(column: "clientID", as: String.self),
                firmaID: cFirmaID,
                name: try row.decode(column: "name", as: String.self),
                surname: (try? row.decode(column: "surname", as: String?.self)) ?? "",
                email: try? row.decode(column: "email", as: String?.self),
                phone: try? row.decode(column: "phone", as: String?.self),
                phone2: try? row.decode(column: "phone2", as: String?.self),
                status: (try? row.decode(column: "status", as: Int.self)) ?? 0,
                country: (try? row.decode(column: "country", as: String?.self)) ?? "",
                street: (try? row.decode(column: "street", as: String?.self)) ?? "",
                postalCode: (try? row.decode(column: "postalCode", as: String?.self)) ?? "",
                city: (try? row.decode(column: "city", as: String?.self)) ?? "",
                houseNumber: (try? row.decode(column: "houseNumber", as: String?.self)) ?? "",
                apartment: try? row.decode(column: "apartment", as: String?.self),
                district: try? row.decode(column: "district", as: String?.self),
                latitude: (try? row.decode(column: "latitude", as: Double?.self)) ?? 0,
                longitude: (try? row.decode(column: "longitude", as: Double?.self)) ?? 0,
                groupe: groupeDTO
            ))
        }

        // Map appointments
        let appointmentsDTO = try aRows.map { try decodeAppointmentRow($0) }

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
        for row in rRows {
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

        // Combine everything
        struct SchedulingResponse: Content {
            var workers: [WorkerOutDTO]
            var clients: [ClientOutDTO]
            var teams: [[String: String]]
            var groupes: [[String: String]]
            var services: [ServiceOutDTO]
            var appointments: [AppointmentDTO]
            var reports: [ReportOutDTO]
        }

        let response = SchedulingResponse(
            workers: workersDTO,
            clients: clientsDTO,
            teams: teamsDTO,
            groupes: groupesDTO,
            services: servicesDTO,
            appointments: appointmentsDTO,
            reports: reportsDTO
        )

        return try await response.encodeResponse(for: req)
    }

    /// Public test endpoint (no auth)
    func vaporTest(req: Request) async throws -> Response {
        try await schedulingDump(req: req)
    }

    /// Auth-protected test endpoint — JWT verification overhead is included
    func vaporAuthTest(req: Request) async throws -> Response {
        // JWT already verified by JWTAuthMiddleware — just run the same query
        try await schedulingDump(req: req)
    }
}
