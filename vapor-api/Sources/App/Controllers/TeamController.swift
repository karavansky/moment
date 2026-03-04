import Vapor
import Fluent

/// CRUD controller for teams: GET/POST/PUT/DELETE /api/scheduling/teams
struct TeamController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let teams = routes.grouped("scheduling", "teams")
        teams.get(use: index)
        teams.post(use: create)
        teams.put(use: update)
        teams.delete(use: remove)
    }

    // GET /api/scheduling/teams
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "No firmaID")
        }

        let teams = try await Team.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .all()

        let result = teams.map { t in
            ["id": t.id ?? "", "teamName": t.teamName, "firmaID": t.firmaID]
        }
        return try await ["teams": result].encodeResponse(for: req)
    }

    // POST /api/scheduling/teams
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else {
            throw Abort(.forbidden)
        }
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "No firmaID")
        }

        struct CreateTeam: Content { var teamName: String; var id: String }
        let body = try req.content.decode(CreateTeam.self)

        let team = Team()
        team.id = body.id
        team.teamName = body.teamName
        team.firmaID = firmaID
        try await team.save(on: req.db)

        return try await team.encodeResponse(status: .ok, for: req)
    }

    // PUT /api/scheduling/teams
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else {
            throw Abort(.forbidden)
        }
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "No firmaID")
        }

        struct UpdateTeam: Content { var id: String; var teamName: String }
        let body = try req.content.decode(UpdateTeam.self)

        guard let team = try await Team.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Team not found")
        }

        team.teamName = body.teamName
        try await team.save(on: req.db)

        return try await team.encodeResponse(for: req)
    }

    // DELETE /api/scheduling/teams
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else {
            throw Abort(.forbidden)
        }
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "No firmaID")
        }

        struct DeleteBody: Content { var id: String }
        let body = try req.content.decode(DeleteBody.self)

        guard let team = try await Team.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Team not found")
        }

        try await team.delete(on: req.db)
        return try await ["success": true].encodeResponse(for: req)
    }
}
