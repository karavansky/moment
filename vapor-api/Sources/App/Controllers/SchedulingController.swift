import Vapor
import Fluent
import FluentPostgresDriver

/// Main scheduling data endpoint: GET /api/scheduling
/// Returns all scheduling data (workers, clients, teams, groupes, services, appointments, reports)
/// with role-based filtering for appointments.
struct SchedulingController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let scheduling = routes.grouped("scheduling")
        scheduling.get(use: index)
    }

    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let userId = user.userId
        let userStatus = user.status

        let db = req.db as! any SQLDatabase

        // Parallel fetch of all data
        async let teamsRaw = Team.query(on: req.db).filter(\.$firmaID == firmaID).all()
        async let groupesRaw = Groupe.query(on: req.db).filter(\.$firmaID == firmaID).all()
        async let servicesRaw = Service.query(on: req.db).filter(\.$firmaID == firmaID).all()

        // Workers with JOINs (same query as WorkerController)
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
            WHERE w."firmaID" = \(bind: firmaID)
            ORDER BY w."name"
            """).all()

        // Clients with JOINs
        async let clientsRows = db.raw("""
            SELECT c.*, g."groupeName"
            FROM clients c
            LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
            WHERE c."firmaID" = \(bind: firmaID)
            ORDER BY c."name"
            """).all()

        // Appointments with complex joins
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
            WHERE a."firmaID" = \(bind: firmaID)
            GROUP BY a."appointmentID", c."clientID"
            ORDER BY a."date", a."startTime"
            """).all()

        // Reports with photos
        async let reportsRows = db.raw("""
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

        // Map workers (reuse WorkerController logic)
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
            let teamDTO: TeamOutDTO? = (teamId != nil && teamName != nil) ?
                TeamOutDTO(id: teamId!, teamName: teamName!, firmaID: firmaID) : nil

            workersDTO.append(WorkerOutDTO(
                id: try row.decode(column: "workerID", as: String.self),
                userID: try? row.decode(column: "userID", as: String?.self),
                firmaID: firmaID,
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
            let groupeDTO: GroupeOutDTO? = (groupeID != nil && groupeName != nil) ?
                GroupeOutDTO(id: groupeID!, groupeName: groupeName!, firmaID: firmaID) : nil

            clientsDTO.append(ClientOutDTO(
                id: try row.decode(column: "clientID", as: String.self),
                firmaID: firmaID,
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
        var appointmentsDTO = try aRows.map { row -> AppointmentDTO in
            try decodeAppointmentRow(row)
        }

        // Role-based filtering of appointments
        var myWorkerID: String? = nil
        var myClientID: String? = nil

        if userStatus == 1 {
            let myWorker = try await Worker.query(on: req.db)
                .filter(\.$userID == userId)
                .filter(\.$firmaID == firmaID)
                .first()
            if let w = myWorker {
                myWorkerID = w.id
                appointmentsDTO = appointmentsDTO.filter { $0.workerIds.contains(w.id ?? "") }
            } else {
                appointmentsDTO = []
            }
        } else if userStatus == 2 {
            let myClient = try await Client.query(on: req.db)
                .filter(\.$userID == userId)
                .filter(\.$firmaID == firmaID)
                .first()
            if let c = myClient {
                myClientID = c.id
                appointmentsDTO = appointmentsDTO.filter { $0.clientID == c.id }
            } else {
                appointmentsDTO = []
            }
        }

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

        // User info
        struct UserDTO: Content {
            var id: String; var firmaID: String; var userName: String
            var status: Int?; var myWorkerID: String?; var myClientID: String?
        }

        let userDTO = UserDTO(
            id: userId, firmaID: firmaID, userName: user.email,
            status: userStatus, myWorkerID: myWorkerID, myClientID: myClientID
        )

        // Build response matching Next.js format
        struct SchedulingResponse: Content {
            var user: UserDTO
            var workers: [WorkerOutDTO]; var clients: [ClientOutDTO]
            var teams: [[String: String]]; var groupes: [[String: String]]
            var services: [ServiceOutDTO]
            var appointments: [AppointmentDTO]; var reports: [ReportOutDTO]
            var firmaID: String
        }

        let response = SchedulingResponse(
            user: userDTO,
            workers: workersDTO, clients: clientsDTO,
            teams: teamsDTO, groupes: groupesDTO,
            services: servicesDTO,
            appointments: appointmentsDTO, reports: reportsDTO,
            firmaID: firmaID
        )

        return try await response.encodeResponse(for: req)
    }
}
