import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for client-grouped appointment reports
/// GET /api/scheduling/reports/clients
/// Access: status=0 (Directors) and status=7 (Sport- und Bäderamt)
struct SchedulingReportsClientsController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let reports = routes.grouped("scheduling", "reports", "clients")
        reports.get(use: index)
    }

    // GET /api/scheduling/reports/clients
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)

        // Check access: только status=0 (Directors) или status=7 (Sport- und Bäderamt)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Berichte anzuzeigen.")
        }

        // Get query parameters
        let dateFrom = try? req.query.get(String.self, at: "dateFrom")
        let dateTo = try? req.query.get(String.self, at: "dateTo")
        let clientID = try? req.query.get(String.self, at: "clientID")
        let workerID = try? req.query.get(String.self, at: "workerID")
        let serviceID = try? req.query.get(String.self, at: "serviceID")

        let db = req.db as! any SQLDatabase

        // Build base SQL query with bind parameter
        var sqlParts: [String] = []
        sqlParts.append("""
            SELECT
                a."appointmentID",
                a."clientID",
                a.date,
                a."startTime",
                a."endTime",
                a.duration,
                a."isFixedTime",
                c.name as "clientName",
                c.surname as "clientSurname",
                c.street as "clientStreet",
                c."houseNumber" as "clientHouseNumber",
                c."postalCode" as "clientPostalCode",
                c.city as "clientCity",
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', w."workerID",
                            'name', w.name,
                            'surname', w.surname
                        )
                    ) FILTER (WHERE w."workerID" IS NOT NULL),
                    '[]'
                ) as workers,
                COALESCE(
                    json_agg(
                        DISTINCT jsonb_build_object(
                            'id', s."serviceID",
                            'name', s.name
                        )
                    ) FILTER (WHERE s."serviceID" IS NOT NULL),
                    '[]'
                ) as services
            FROM appointments a
            INNER JOIN clients c ON a."clientID" = c."clientID"
            LEFT JOIN appointment_workers aw ON a."appointmentID" = aw."appointmentID"
            LEFT JOIN workers w ON aw."workerID" = w."workerID"
            LEFT JOIN appointment_services asrv ON a."appointmentID" = asrv."appointmentID"
            LEFT JOIN services s ON asrv."serviceID" = s."serviceID"
            WHERE a."firmaID" =
            """)

        // Add filters to SQL parts (will be interpolated later)
        var whereConditions: [String] = []
        if let df = dateFrom {
            whereConditions.append(" AND a.date >= '\(df)'::date")
        }
        if let dt = dateTo {
            whereConditions.append(" AND a.date <= '\(dt)'::date")
        }
        if let cid = clientID {
            whereConditions.append(" AND a.\"clientID\" = '\(cid)'")
        }
        if let wid = workerID {
            whereConditions.append(" AND aw.\"workerID\" = '\(wid)'")
        }
        if let sid = serviceID {
            whereConditions.append(" AND asrv.\"serviceID\" = '\(sid)'")
        }

        sqlParts.append("""
            \(whereConditions.joined())
            GROUP BY
                a."appointmentID",
                a."clientID",
                a.date,
                a."startTime",
                a."endTime",
                a.duration,
                a."isFixedTime",
                c.name,
                c.surname,
                c.street,
                c."houseNumber",
                c."postalCode",
                c.city
            ORDER BY
                c.surname ASC,
                c.name ASC,
                a.date ASC,
                a."startTime" ASC
            """)

        // Execute query with bind parameter
        let rows = try await db.raw("""
            \(unsafeRaw: sqlParts[0])\(bind: firmaID)\(unsafeRaw: sqlParts[1])
            """).all()

        // Format response
        struct WorkerDTO: Content {
            var id: String
            var name: String
            var surname: String
            var fullName: String
        }

        struct ServiceDTO: Content {
            var id: String
            var name: String
        }

        struct ClientDTO: Content {
            var id: String
            var name: String
            var surname: String
            var fullName: String
            var address: String
        }

        struct AppointmentDTO: Content {
            var id: String
            var date: Date
            var startTime: Date?
            var endTime: Date?
            var duration: Int
            var isFixedTime: Bool
            var client: ClientDTO
            var workers: [WorkerDTO]
            var services: [ServiceDTO]
        }

        var appointments: [AppointmentDTO] = []

        for row in rows {
            let appointmentID = try row.decode(column: "appointmentID", as: String.self)
            let date = try row.decode(column: "date", as: Date.self)
            let startTime = try? row.decode(column: "startTime", as: Date?.self)
            let endTime = try? row.decode(column: "endTime", as: Date?.self)
            let duration = try row.decode(column: "duration", as: Int.self)
            let isFixedTime = (try? row.decode(column: "isFixedTime", as: Bool.self)) ?? false

            let clientID = try row.decode(column: "clientID", as: String.self)
            let clientName = try row.decode(column: "clientName", as: String.self)
            let clientSurname = try row.decode(column: "clientSurname", as: String.self)
            let clientStreet = (try? row.decode(column: "clientStreet", as: String?.self)) ?? ""
            let clientHouseNumber = (try? row.decode(column: "clientHouseNumber", as: String?.self)) ?? ""
            let clientPostalCode = (try? row.decode(column: "clientPostalCode", as: String?.self)) ?? ""
            let clientCity = (try? row.decode(column: "clientCity", as: String?.self)) ?? ""

            let workersJSON = try row.decode(column: "workers", as: String.self)
            let servicesJSON = try row.decode(column: "services", as: String.self)

            // Parse workers JSON
            var workers: [WorkerDTO] = []
            if let workersData = workersJSON.data(using: String.Encoding.utf8),
               let workersArray = try? JSONDecoder().decode([[String: String]].self, from: workersData) {
                workers = workersArray.map {
                    WorkerDTO(
                        id: $0["id"] ?? "",
                        name: $0["name"] ?? "",
                        surname: $0["surname"] ?? "",
                        fullName: "\($0["surname"] ?? "") \($0["name"] ?? "")"
                    )
                }
            }

            // Parse services JSON
            var services: [ServiceDTO] = []
            if let servicesData = servicesJSON.data(using: String.Encoding.utf8),
               let servicesArray = try? JSONDecoder().decode([[String: String]].self, from: servicesData) {
                services = servicesArray.map {
                    ServiceDTO(
                        id: $0["id"] ?? "",
                        name: $0["name"] ?? ""
                    )
                }
            }

            let client = ClientDTO(
                id: clientID,
                name: clientName,
                surname: clientSurname,
                fullName: "\(clientSurname) \(clientName)",
                address: "\(clientStreet) \(clientHouseNumber), \(clientPostalCode) \(clientCity)".trimmingCharacters(in: .whitespacesAndNewlines)
            )

            appointments.append(AppointmentDTO(
                id: appointmentID,
                date: date,
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                isFixedTime: isFixedTime,
                client: client,
                workers: workers,
                services: services
            ))
        }

        struct ResponseDTO: Content {
            let appointments: [AppointmentDTO]
            let count: Int
        }

        let response = ResponseDTO(
            appointments: appointments,
            count: appointments.count
        )

        return try await response.encodeResponse(for: req)
    }
}
