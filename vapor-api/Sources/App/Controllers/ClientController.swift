import Vapor
import Fluent
import FluentPostgresDriver

/// CRUD controller for clients: GET/POST/PUT/DELETE /api/scheduling/clients
struct ClientController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let clients = routes.grouped("scheduling", "clients")
        clients.get(use: index)
        clients.post(use: create)
        clients.put(use: update)
        clients.delete(use: remove)
    }

    // GET — raw SQL with LEFT JOIN groupes
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let rows = try await (req.db as! any SQLDatabase).raw("""
            SELECT c.*, g."groupeName"
            FROM clients c
            LEFT JOIN groupes g ON c."groupeID" = g."groupeID"
            WHERE c."firmaID" = \(bind: firmaID)
            ORDER BY c."name"
            """).all()

        struct GroupeDTO: Content {
            var id: String; var groupeName: String; var firmaID: String
        }
        struct ClientDTO: Content {
            var id: String; var firmaID: String
            var name: String; var surname: String; var email: String?
            var phone: String?; var phone2: String?; var status: Int
            var country: String; var street: String; var postalCode: String
            var city: String; var houseNumber: String; var apartment: String?
            var district: String?; var latitude: Double; var longitude: Double
            var groupe: GroupeDTO?
        }

        var clientDTOs: [ClientDTO] = []
        for row in rows {
            let groupeID = try? row.decode(column: "groupeID", as: String?.self)
            let groupeName = try? row.decode(column: "groupeName", as: String?.self)

            let groupeDTO: GroupeDTO? = (groupeID != nil && groupeName != nil) ?
                GroupeDTO(id: groupeID!, groupeName: groupeName!, firmaID: firmaID) : nil

            clientDTOs.append(ClientDTO(
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

        return try await ["clients": clientDTOs].encodeResponse(for: req)
    }

    // POST
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Objekte zu erstellen.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var name: String; var surname: String?; var email: String?
            var phone: String?; var phone2: String?; var status: Int?
            var groupeID: String?; var country: String?; var street: String?
            var postalCode: String?; var city: String?; var houseNumber: String?
            var apartment: String?; var district: String?
            var latitude: Double?; var longitude: Double?
        }
        let body = try req.content.decode(Body.self)

        let client = Client()
        client.id = generateId()
        client.firmaID = firmaID
        client.name = body.name
        client.surname = body.surname
        client.email = body.email
        client.phone = body.phone
        client.phone2 = body.phone2
        client.status = body.status ?? 0
        // Set groupeID only if it's not empty string
        client.groupeID = (body.groupeID?.isEmpty == false) ? body.groupeID : nil
        client.country = body.country
        client.street = body.street
        client.postalCode = body.postalCode
        client.city = body.city
        client.houseNumber = body.houseNumber
        client.apartment = body.apartment
        client.district = body.district
        client.latitude = body.latitude
        client.longitude = body.longitude
        try await client.save(on: req.db)

        pgNotify(req: req, firmaID: firmaID, type: "client_created")
        return try await client.encodeResponse(status: .ok, for: req)
    }

    // PUT
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Objekte zu bearbeiten.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var id: String; var name: String?; var surname: String?; var email: String?
            var phone: String?; var phone2: String?; var status: Int?
            var groupeID: String?; var country: String?; var street: String?
            var postalCode: String?; var city: String?; var houseNumber: String?
            var apartment: String?; var district: String?
            var latitude: Double?; var longitude: Double?
        }
        let body = try req.content.decode(Body.self)

        guard let client = try await Client.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Client not found")
        }

        if let v = body.name { client.name = v }
        if let v = body.surname { client.surname = v }
        if let v = body.email { client.email = v }
        if let v = body.phone { client.phone = v }
        if let v = body.phone2 { client.phone2 = v }
        if let v = body.status { client.status = v }
        // Set groupeID only if it's not empty string, otherwise set to nil
        if body.groupeID != nil {
            client.groupeID = (body.groupeID?.isEmpty == false) ? body.groupeID : nil
        }
        if let v = body.country { client.country = v }
        if let v = body.street { client.street = v }
        if let v = body.postalCode { client.postalCode = v }
        if let v = body.city { client.city = v }
        if let v = body.houseNumber { client.houseNumber = v }
        if let v = body.apartment { client.apartment = v }
        if let v = body.district { client.district = v }
        if body.latitude != nil { client.latitude = body.latitude }
        if body.longitude != nil { client.longitude = body.longitude }
        try await client.save(on: req.db)

        pgNotify(req: req, firmaID: firmaID, type: "client_updated")
        return try await client.encodeResponse(for: req)
    }

    // DELETE
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Objekte zu löschen.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String }
        let body = try req.content.decode(Body.self)

        guard let client = try await Client.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Client not found")
        }

        try await client.delete(on: req.db)
        pgNotify(req: req, firmaID: firmaID, type: "client_deleted")
        return try await ["success": true].encodeResponse(for: req)
    }
}
