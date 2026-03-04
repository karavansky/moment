import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for staff status: GET /api/staff/sync-device, GET /api/staff/verify-push
struct StaffController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let staff = routes.grouped("staff")
        staff.post("sync-device", use: syncDevice)
    }

    // POST /api/staff/sync-device
    func syncDevice(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        
        struct Query: Content {
            var batteryLevel: Double?
            var batteryStatus: String?
            var appVersion: String?
            var osVersion: String?
        }
        let query = try req.content.decode(Query.self)
        
        let db = req.db as! any SQLDatabase
        
        // Update user
        var sqlUpdates: [String] = []
        var binds: [Encodable] = []
        
        if let v = query.batteryLevel { sqlUpdates.append("\"batteryLevel\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = query.batteryStatus { sqlUpdates.append("\"batteryStatus\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = query.appVersion { sqlUpdates.append("\"pwaVersion\" = $\(binds.count + 1)"); binds.append(v) }
        if let v = query.osVersion { sqlUpdates.append("\"osVersion\" = $\(binds.count + 1)"); binds.append(v) }
        
        if !sqlUpdates.isEmpty {
            binds.append(user.userId)
            
            // Re-using manual execution due to bindings annoyance with raw Postgres query
            if let v = query.batteryLevel { try await db.raw("UPDATE users SET \"batteryLevel\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run() }
            if let v = query.batteryStatus { try await db.raw("UPDATE users SET \"batteryStatus\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run() }
            if let v = query.appVersion { try await db.raw("UPDATE users SET \"pwaVersion\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run() }
            if let v = query.osVersion { try await db.raw("UPDATE users SET \"osVersion\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run() }
            
            // Notify if worker
            if let _ = try await Worker.query(on: req.db).filter(\.$userID == user.userId).first() {
                pgNotify(req: req, firmaID: firmaID, type: "worker_updated")
            }
        }
        
        return try await ["success": true].encodeResponse(for: req)
    }
}
