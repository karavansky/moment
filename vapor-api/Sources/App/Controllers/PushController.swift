import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for pushing subscriptions: POST /api/push/subscribe, POST /api/push/unsubscribe, GET /api/push/vapid-key
struct PushController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let push = routes.grouped("push")
        push.get("vapid-key", use: getVapidKey)
        
        // Protected routes requiring authentication
        let protected = push.grouped(JWTAuthMiddleware())
        protected.post("subscribe", use: subscribe)
        protected.post("unsubscribe", use: unsubscribe)
    }

    // GET /api/push/vapid-key
    func getVapidKey(req: Request) async throws -> Response {
        // Vapor shouldn't need auth just for public key
        let key = Environment.get("VAPID_PUBLIC_KEY") ?? "BJoG639sH85zL48M0gIqD-h_K2S-2U_rL41QO63k-b76K8H9P81PqD-28E0D7D7R8B82-"
        return try await ["publicKey": key].encodeResponse(for: req)
    }

    // POST /api/push/subscribe
    func subscribe(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)

        struct Keys: Content { var p256dh: String; var auth: String }
        struct SubscriptionData: Content { var endpoint: String; var keys: Keys }
        struct Body: Content { var subscription: SubscriptionData }
        let body = try req.content.decode(Body.self)

        let subData = body.subscription

        // Use PostgreSQL UPSERT to handle race condition
        let db = req.db as! SQLDatabase
        let now = Date()

        try await db.raw("""
            INSERT INTO push_subscriptions (\"userID\", endpoint, p256dh, auth, \"createdAt\", \"lastUsedAt\")
            VALUES (\(bind: user.userId), \(bind: subData.endpoint), \(bind: subData.keys.p256dh), \(bind: subData.keys.auth), \(bind: now), \(bind: now))
            ON CONFLICT (endpoint)
            DO UPDATE SET
                \"userID\" = EXCLUDED.\"userID\",
                p256dh = EXCLUDED.p256dh,
                auth = EXCLUDED.auth,
                \"lastUsedAt\" = EXCLUDED.\"lastUsedAt\"
            """).run()

        return try await ["success": true].encodeResponse(status: .ok, for: req)
    }

    // POST /api/push/unsubscribe
    func unsubscribe(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        
        struct Body: Content { var endpoint: String }
        let body = try req.content.decode(Body.self)

        // Delete subscription
        if let existing = try await PushSubscription.query(on: req.db)
            .filter(\.$endpoint == body.endpoint)
            .filter(\.$userID == user.userId) // Ensure it belongs to them
            .first() {
            
            try await existing.delete(on: req.db)
        }

        return try await ["success": true].encodeResponse(for: req)
    }
}
