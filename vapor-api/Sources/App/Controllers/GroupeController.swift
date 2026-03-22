import Vapor
import Fluent

/// CRUD controller for groupes: GET/POST/PUT/DELETE /api/scheduling/groupes
struct GroupeController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let groupes = routes.grouped("scheduling", "groupes")
        groupes.get(use: index)
        groupes.post(use: create)
        groupes.put(use: update)
        groupes.delete(use: remove)
    }

    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let groupes = try await Groupe.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .all()

        let result = groupes.map { g in
            ["id": g.id ?? "", "groupeName": g.groupeName, "firmaID": g.firmaID]
        }
        return try await ["groupes": result].encodeResponse(for: req)
    }

    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Gruppen zu erstellen.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var groupeName: String }
        let body = try req.content.decode(Body.self)

        let groupe = Groupe()
        groupe.id = generateId()
        groupe.groupeName = body.groupeName
        groupe.firmaID = firmaID
        try await groupe.save(on: req.db)

        return try await groupe.encodeResponse(status: .ok, for: req)
    }

    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Gruppen zu bearbeiten.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String; var groupeName: String }
        let body = try req.content.decode(Body.self)

        guard let groupe = try await Groupe.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Groupe not found")
        }

        groupe.groupeName = body.groupeName
        try await groupe.save(on: req.db)

        return try await groupe.encodeResponse(for: req)
    }

    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        // Allow: status=0 (Director), status=7 (Sport- und Bäderamt), or nil (pre-migration)
        guard user.status == nil || user.status == 0 || user.status == 7 else {
            throw Abort(.forbidden, reason: "NO_PERMISSION: Sie haben keine Berechtigung, Gruppen zu löschen.")
        }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String }
        let body = try req.content.decode(Body.self)

        guard let groupe = try await Groupe.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Groupe not found")
        }

        try await groupe.delete(on: req.db)
        return try await ["success": true].encodeResponse(for: req)
    }
}

/// Generates a nanoid-like ID (21 chars)
func generateId() -> String {
    let chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-"
    return String((0..<21).map { _ in chars.randomElement()! })
}
