import Vapor

/// Handles private file downloads via Nginx X-Accel-Redirect to SeaweedFS.
/// Port of `app/api/files/[...path]/route.ts`.
struct FileController: RouteCollection, Sendable {

    func boot(routes: any RoutesBuilder) throws {
        let files = routes.grouped("files")

        // Catch-all route: GET /api/files/**
        files.get("**", use: download)
    }

    /// Downloads a file from SeaweedFS via Nginx X-Accel-Redirect.
    ///
    /// - For public demo paths (containing `3Eoxlmzdr4uEJggFueFnB`): no auth required (via FileAuthMiddleware)
    /// - For other paths: requires valid JWT session (via FileAuthMiddleware)
    @Sendable
    func download(req: Request) async throws -> Response {
        // 1. Extract file path from catch-all parameters
        let pathComponents = req.parameters.getCatchall()

        guard !pathComponents.isEmpty else {
            throw Abort(.badRequest, reason: "File path not provided")
        }

        let requestedPath = pathComponents.joined(separator: "/")
        req.logger.info("File request: \(requestedPath)")

        // Auth is handled by FileAuthMiddleware - public paths skip auth, private paths require JWT

        // 3. Return X-Accel-Redirect response
        // Nginx intercepts this header and serves the file from SeaweedFS directly
        // See: location ^~ /private-seaweed/ in nginx config
        let response = Response(status: .ok)
        // Send the un-prefixed path because nginx rewrites ^/private-seaweed/(.*) /$1
        response.headers.add(name: "X-Accel-Redirect", value: "/private-seaweed/\(requestedPath)")
        response.headers.add(name: "Content-Type", value: "application/octet-stream")

        return response
    }
}
