import Vapor

/// Middleware that restricts access to admin users only.
/// Must be used after `JWTAuthMiddleware` in the middleware chain.
struct AdminMiddleware: AsyncMiddleware, Sendable {

    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        let user = try request.auth.require(AuthenticatedUser.self)

        guard user.isAdmin else {
            throw Abort(.forbidden, reason: "Admin access required")
        }

        return try await next.respond(to: request)
    }
}
