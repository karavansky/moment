import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for settings: GET /api/settings, PATCH /api/settings
struct SettingsController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let settings = routes.grouped("settings")
        settings.get(use: getSettings)
        settings.patch(use: updateSettings)
    }

    // GET /api/settings
    func getSettings(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Admin/director settings
        // organisations table: firmaID, name, createdAt  (no organisationName/logoUrl/accentColor)
        // users table: no surname
        if user.status == nil || user.status == 0 {
            let row = try await (req.db as! any SQLDatabase).raw("""
                SELECT
                  u."pushNotificationsEnabled",
                  u."geolocationEnabled",
                  u."name",
                  u."email",
                  o."name" AS "organisationName",
                  o."firmaID"
                FROM users u
                LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
                WHERE u."userID" = \(bind: user.userId)
                """).first()

            if let row = row {
                struct SettingsOut: Content {
                    var pushNotificationsEnabled: Bool?
                    var geolocationEnabled: Bool?
                    var name: String?
                    var email: String?
                    var organisationName: String?
                    var firmaID: String?
                }
                let resp = SettingsOut(
                    pushNotificationsEnabled: try? row.decode(column: "pushNotificationsEnabled", as: Bool?.self),
                    geolocationEnabled: try? row.decode(column: "geolocationEnabled", as: Bool?.self),
                    name: try? row.decode(column: "name", as: String?.self),
                    email: try? row.decode(column: "email", as: String?.self),
                    organisationName: try? row.decode(column: "organisationName", as: String?.self),
                    firmaID: try? row.decode(column: "firmaID", as: String?.self)
                )
                return try await resp.encodeResponse(for: req)
            }
        } else if user.status == 1 {
            // Worker settings — no surname on users, no extra cols on organisations
            let row = try await (req.db as! any SQLDatabase).raw("""
                SELECT
                    u."pushNotificationsEnabled",
                    u."geolocationEnabled",
                    u."name",
                    u."email",
                    o."name" AS "organisationName",
                    o."firmaID",
                    w."name" AS "workerName",
                    w."surname" AS "workerSurname",
                    w."email" AS "workerEmail"
                FROM users u
                LEFT JOIN organisations o ON u."firmaID" = o."firmaID"
                LEFT JOIN workers w ON u."userID" = w."userID" AND w."firmaID" = \(bind: firmaID)
                WHERE u."userID" = \(bind: user.userId)
                """).first()
            
            if let row = row {
                struct WorkerSettingsOut: Content {
                    var pushNotificationsEnabled: Bool?
                    var geolocationEnabled: Bool?
                    var name: String?
                    var email: String?
                    var organisationName: String?
                    var firmaID: String?
                    var workerName: String?
                    var workerSurname: String?
                    var workerEmail: String?
                }
                let resp = WorkerSettingsOut(
                    pushNotificationsEnabled: try? row.decode(column: "pushNotificationsEnabled", as: Bool?.self),
                    geolocationEnabled: try? row.decode(column: "geolocationEnabled", as: Bool?.self),
                    name: try? row.decode(column: "name", as: String?.self),
                    email: try? row.decode(column: "email", as: String?.self),
                    organisationName: try? row.decode(column: "organisationName", as: String?.self),
                    firmaID: try? row.decode(column: "firmaID", as: String?.self),
                    workerName: try? row.decode(column: "workerName", as: String?.self),
                    workerSurname: try? row.decode(column: "workerSurname", as: String?.self),
                    workerEmail: try? row.decode(column: "workerEmail", as: String?.self)
                )
                return try await resp.encodeResponse(for: req)
            }
        }
        
        return try await ["error": "User settings not found"].encodeResponse(status: .notFound, for: req)
    }

    // PATCH /api/settings
    func updateSettings(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var pushNotificationsEnabled: Bool?
            var geolocationEnabled: Bool?
        }
        let body = try req.content.decode(Body.self)

        let db = req.db as! any SQLDatabase
        
        if let push = body.pushNotificationsEnabled {
            try await db.raw("""
                UPDATE users SET "pushNotificationsEnabled" = \(bind: push) WHERE "userID" = \(bind: user.userId)
                """).run()
        }
        if let geo = body.geolocationEnabled {
            try await db.raw("""
                UPDATE users SET "geolocationEnabled" = \(bind: geo) WHERE "userID" = \(bind: user.userId)
                """).run()
        }

        // Find worker to update lastLogin / push state and notify
        if let _ = try await Worker.query(on: req.db).filter(\.$userID == user.userId).first() {
            pgNotify(req: req, firmaID: firmaID, type: "worker_updated")
        }

        return try await ["success": true].encodeResponse(for: req)
    }
}
