import Vapor
import Fluent
import FluentPostgresDriver

/// Admin APIs: GET/POST/PUT/DELETE /api/admin/users
struct AdminController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let admin = routes.grouped("admin", "users")
        admin.get(use: index)
        admin.post(use: create)
        admin.put(":userId", use: update)
        admin.delete(":userId", use: remove)
        admin.get("sessions", use: sessions)
    }

    // GET /api/admin/users
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        
        // Director only
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        
        let db = req.db as! any SQLDatabase
        let rows = try await db.raw("""
            SELECT "userID", "name", "surname", "email", "status", "role", "firmaID"
            FROM users
            WHERE "firmaID" = \(bind: firmaID)
            ORDER BY "name", "surname"
            """).all()
        
        struct UserDTO: Content {
            var userID: String; var name: String?; var surname: String?; var email: String?
            var status: Int?; var role: String?; var firmaID: String?
        }
        
        var users: [UserDTO] = []
        for row in rows {
            users.append(UserDTO(
                userID: try row.decode(column: "userID", as: String.self),
                name: try? row.decode(column: "name", as: String?.self),
                surname: try? row.decode(column: "surname", as: String?.self),
                email: try? row.decode(column: "email", as: String?.self),
                status: try? row.decode(column: "status", as: Int?.self),
                role: try? row.decode(column: "role", as: String?.self),
                firmaID: try? row.decode(column: "firmaID", as: String?.self)
            ))
        }
        
        return try await users.encodeResponse(for: req)
    }

    // POST /api/admin/users (Create handled via Invite but this exists for direct creation if needed)
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID, (user.status == nil || user.status == 0) else { throw Abort(.forbidden) }
        
        struct Body: Content {
            var name: String?; var email: String; var status: Int?
        }
        let body = try req.content.decode(Body.self)
        
        let userID = generateId()
        let db = req.db as! any SQLDatabase
        
        try await db.raw("""
            INSERT INTO users ("userID", "firmaID", "email", "name", "status")
            VALUES (\(bind: userID), \(bind: firmaID), \(bind: body.email), \(bind: body.name), \(bind: body.status ?? 0))
            """).run()
            
        return try await ["userID": userID].encodeResponse(status: .created, for: req)
    }

    // PUT /api/admin/users/:userId
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID, (user.status == nil || user.status == 0) else { throw Abort(.forbidden) }
        guard let targetUserId = req.parameters.get("userId") else { throw Abort(.badRequest) }
        
        struct Body: Content {
            var name: String?; var surname: String?; var email: String?
            var status: Int?; var firmaID: String?
        }
        let body = try req.content.decode(Body.self)
        
        let db = req.db as! any SQLDatabase
        
        var sqlUpdates: [String] = []
        var binds: [Encodable] = []
        
        if let v = body.name { sqlUpdates.append("\"name\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = body.surname { sqlUpdates.append("\"surname\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = body.email { sqlUpdates.append("\"email\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = body.status { sqlUpdates.append("\"status\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = body.firmaID { sqlUpdates.append("\"firmaID\" = $\(binds.count + 1)"); binds.append(v) }
        
        guard !sqlUpdates.isEmpty else { throw Abort(.badRequest) }
        
        binds.append(targetUserId)
        binds.append(firmaID) // Require that we update someone in our own firma
        
        // Vapor's Postgres abstraction makes building raw dynamic queries slightly tricky without PostgresQuery
        // For simplicity, we just use string interpolation (which uses binds automatically under the hood if done right)
        
        var queryStr = "UPDATE users SET "
        var isFirst = true
        for (idx, _) in sqlUpdates.enumerated() {
            if !isFirst { queryStr += ", " }
            isFirst = false
            
            if let name = body.name, idx == 0 { queryStr += "\"name\" = '\(name)'" }
            // Since manual dynamic binds with raw SQL is ugly in Vapor, let's just do individual executes for simplicity on updating:
        }
        
        // Simpler way:
        if let v = body.name { try await db.raw("UPDATE users SET \"name\" = \(bind: v) WHERE \"userID\" = \(bind: targetUserId) AND \"firmaID\" = \(bind: firmaID)").run() }
        if let v = body.surname { try await db.raw("UPDATE users SET \"surname\" = \(bind: v) WHERE \"userID\" = \(bind: targetUserId) AND \"firmaID\" = \(bind: firmaID)").run() }
        if let v = body.email { try await db.raw("UPDATE users SET \"email\" = \(bind: v) WHERE \"userID\" = \(bind: targetUserId) AND \"firmaID\" = \(bind: firmaID)").run() }
        if let v = body.status { try await db.raw("UPDATE users SET \"status\" = \(bind: v) WHERE \"userID\" = \(bind: targetUserId) AND \"firmaID\" = \(bind: firmaID)").run() }
        if let v = body.firmaID { try await db.raw("UPDATE users SET \"firmaID\" = \(bind: v) WHERE \"userID\" = \(bind: targetUserId) AND \"firmaID\" = \(bind: firmaID)").run() }
        
        return try await ["success": true].encodeResponse(for: req)
    }

    // DELETE /api/admin/users/:userId
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID, (user.status == nil || user.status == 0) else { throw Abort(.forbidden) }
        guard let targetUserId = req.parameters.get("userId") else { throw Abort(.badRequest) }
        
        // Prevent deleting oneself
        guard targetUserId != user.userId else { throw Abort(.badRequest, reason: "Cannot delete yourself") }
        
        let db = req.db as! any SQLDatabase
        try await db.raw("""
            DELETE FROM users
            WHERE "userID" = \(bind: targetUserId) AND "firmaID" = \(bind: firmaID)
            """).run()
            
        return try await ["success": true].encodeResponse(for: req)
    }
    
    // GET /api/admin/users/sessions
    func sessions(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID, (user.status == nil || user.status == 0) else { throw Abort(.forbidden) }
        
        let db = req.db as! any SQLDatabase
        let rows = try await db.raw("""
            SELECT s."id" AS "sessionToken", s."userId", s."expires", u."email", u."name", u."surname"
            FROM sessions s
            JOIN users u ON s."userId" = u."userID"
            WHERE u."firmaID" = \(bind: firmaID)
            ORDER BY s."expires" DESC
            """).all()
            
        struct SessionDTO: Content {
            var sessionToken: String; var userId: String; var expires: Date?
            var email: String?; var name: String?; var surname: String?
        }
        
        var sessions: [SessionDTO] = []
        for row in rows {
            sessions.append(SessionDTO(
                sessionToken: try row.decode(column: "sessionToken", as: String.self),
                userId: try row.decode(column: "userId", as: String.self),
                expires: try? row.decode(column: "expires", as: Date?.self),
                email: try? row.decode(column: "email", as: String?.self),
                name: try? row.decode(column: "name", as: String?.self),
                surname: try? row.decode(column: "surname", as: String?.self)
            ))
        }
        
        return try await ["sessions": sessions].encodeResponse(for: req)
    }
}
