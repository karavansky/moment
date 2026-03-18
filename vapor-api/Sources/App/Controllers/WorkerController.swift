import Vapor
import Fluent
import FluentPostgresDriver

/// CRUD controller for workers: GET/POST/PUT/DELETE /api/scheduling/workers
struct WorkerController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let workers = routes.grouped("scheduling", "workers")
        workers.get(use: index)
        workers.post(use: create)
        workers.put(use: update)
        workers.delete(use: remove)
    }

    // GET — uses raw SQL to match Next.js query with JOINs (teams, users, push_subscriptions)
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let rows = try await (req.db as! any SQLDatabase).raw("""
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

        struct WorkerDTO: Content {
            var id: String; var userID: String?; var firmaID: String
            var name: String; var surname: String; var email: String
            var phone: String?; var phone2: String?
            var teamId: String?; var team: TeamDTO?
            var isAdress: Bool; var status: Int
            var country: String?; var street: String?; var postalCode: String?
            var city: String?; var houseNumber: String?; var apartment: String?
            var district: String?; var latitude: Double?; var longitude: Double?
            var lastLoginAt: String?
            var pushNotificationsEnabled: Bool?; var geolocationEnabled: Bool?
            var hasPushSubscription: Bool?; var pwaVersion: String?
            var osVersion: String?; var batteryLevel: Double?; var batteryStatus: String?
            // Transport fields
            var hasVehicle: Bool?; var vehicleID: String?; var isOnline: Bool?
        }
        struct TeamDTO: Content {
            var id: String; var teamName: String; var firmaID: String
        }

        var workerDTOs: [WorkerDTO] = []
        for row in rows {
            let wid = try row.decode(column: "workerID", as: String.self)
            let teamId = try? row.decode(column: "teamId", as: String?.self)
            let teamName = try? row.decode(column: "teamName", as: String?.self)
            let lastLogin = try? row.decode(column: "lastLoginAt", as: Date?.self)

            let teamDTO: TeamDTO? = (teamId != nil && teamName != nil) ?
                TeamDTO(id: teamId!, teamName: teamName!, firmaID: firmaID) : nil

            workerDTOs.append(WorkerDTO(
                id: wid,
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
                batteryStatus: try? row.decode(column: "batteryStatus", as: String?.self),
                // Transport fields
                hasVehicle: try? row.decode(column: "hasVehicle", as: Bool?.self),
                vehicleID: try? row.decode(column: "vehicleID", as: String?.self),
                isOnline: try? row.decode(column: "isOnline", as: Bool?.self)
            ))
        }

        return try await ["workers": workerDTOs].encodeResponse(for: req)
    }

    // POST
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var id: String; var name: String; var surname: String?
            var email: String?; var phone: String?; var phone2: String?
            var teamId: String?; var isAdress: Bool?; var status: Int?
            var country: String?; var street: String?; var postalCode: String?
            var city: String?; var houseNumber: String?; var apartment: String?
            var district: String?; var latitude: Double?; var longitude: Double?
        }
        let body = try req.content.decode(Body.self)

        let worker = Worker()
        worker.id = body.id
        worker.firmaID = firmaID
        worker.name = body.name
        worker.surname = body.surname
        worker.email = body.email
        worker.phone = body.phone
        worker.phone2 = body.phone2
        worker.teamId = body.teamId
        worker.isAdress = body.isAdress ?? false
        worker.status = body.status ?? 0
        worker.country = body.country
        worker.street = body.street
        worker.postalCode = body.postalCode
        worker.city = body.city
        worker.houseNumber = body.houseNumber
        worker.apartment = body.apartment
        worker.district = body.district
        worker.latitude = body.latitude
        worker.longitude = body.longitude
        try await worker.save(on: req.db)

        pgNotify(req: req, firmaID: firmaID, type: "worker_created")
        return try await worker.encodeResponse(status: .ok, for: req)
    }

    // PUT
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content, Sendable {
            var id: String; var name: String?; var surname: String?
            var email: String?; var phone: String?; var phone2: String?
            var teamId: String?; var isAdress: Bool?; var status: Int?
            var country: String?; var street: String?; var postalCode: String?
            var city: String?; var houseNumber: String?; var apartment: String?
            var district: String?; var latitude: Double?; var longitude: Double?
        }
        let body = try req.content.decode(Body.self)

        guard let worker = try await Worker.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Worker not found")
        }

        if let v = body.name { worker.name = v }
        if let v = body.surname { worker.surname = v }
        if let v = body.email { worker.email = v }
        if let v = body.phone { worker.phone = v }
        if let v = body.phone2 { worker.phone2 = v }
        if body.teamId != nil { worker.teamId = body.teamId }
        if let v = body.isAdress { worker.isAdress = v }
        if let v = body.status { worker.status = v }
        if let v = body.country { worker.country = v }
        if let v = body.street { worker.street = v }
        if let v = body.postalCode { worker.postalCode = v }
        if let v = body.city { worker.city = v }
        if let v = body.houseNumber { worker.houseNumber = v }
        if let v = body.apartment { worker.apartment = v }
        if let v = body.district { worker.district = v }
        if body.latitude != nil { worker.latitude = body.latitude }
        if body.longitude != nil { worker.longitude = body.longitude }
        try await worker.save(on: req.db)

        pgNotify(req: req, firmaID: firmaID, type: "worker_updated")
        return try await worker.encodeResponse(for: req)
    }

    // DELETE
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String }
        let body = try req.content.decode(Body.self)

        guard let worker = try await Worker.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Worker not found")
        }

        try await worker.delete(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "worker_deleted")
        return try await ["success": true].encodeResponse(for: req)
    }
}

// MARK: - Helpers

/// Fire-and-forget pg_notify to match Next.js scheduling-events
func pgNotify(req: Request, firmaID: String, type: String) {
    let channel = "scheduling_" + firmaID.lowercased().filter { $0.isLetter || $0.isNumber || $0 == "_" }
    let payload = "{\"type\":\"\(type)\",\"firmaID\":\"\(firmaID)\"}"
    Task {
        do {
            try await (req.db as! any SQLDatabase).raw(
                "SELECT pg_notify(\(bind: channel), \(bind: payload))"
            ).run()
        } catch {
            req.logger.error("pg_notify failed: \(error)")
        }
    }
}

extension Date {
    var iso8601String: String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        return formatter.string(from: self)
    }
}
