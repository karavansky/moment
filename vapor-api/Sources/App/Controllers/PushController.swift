import Vapor
import Fluent

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

        // Check for existing subscription for this endpoint
        if let existing = try await PushSubscription.query(on: req.db)
            .filter(\.$endpoint == subData.endpoint)
            .first() {
            
            // Update user if different
            if existing.userID != user.userId {
                existing.userID = user.userId
                try await existing.save(on: req.db)
            }
        } else {
            // Create new
            let sub = PushSubscription(
                userID: user.userId,
                endpoint: subData.endpoint,
                p256dh: subData.keys.p256dh,
                auth: subData.keys.auth
            )
            try await sub.save(on: req.db)
        }

        return try await ["success": true].encodeResponse(status: .created, for: req)
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
