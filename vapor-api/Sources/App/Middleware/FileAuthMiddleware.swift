import Vapor

/// Custom middleware for FileController that skips auth for public demo paths.
/// Public paths contain the demo firmaID: 3Eoxlmzdr4uEJggFueFnB
struct FileAuthMiddleware: AsyncMiddleware, Sendable {

    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        // Extract path components from catch-all route
        let pathComponents = request.parameters.getCatchall()

        // Check if this is a public demo path (contains demo firmaID)
        let isPublicPath = pathComponents.contains("3Eoxlmzdr4uEJggFueFnB")

        request.logger.info("FileAuthMiddleware: path=\(pathComponents.joined(separator: "/")), isPublic=\(isPublicPath)")

        if isPublicPath {
            // Public path - skip authentication
            return try await next.respond(to: request)
        } else {
            // Private path - delegate to JWTAuthMiddleware
            let jwtMiddleware = JWTAuthMiddleware()
            return try await jwtMiddleware.respond(to: request, chainingTo: next)
        }
    }
}
