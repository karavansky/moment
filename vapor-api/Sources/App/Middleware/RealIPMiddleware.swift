import Vapor

/// Middleware that extracts the real client IP from reverse-proxy headers.
/// Vapor's built-in `XForwardedMiddleware` handles this, but this provides
/// a convenient helper for logging.
struct RealIPMiddleware: AsyncMiddleware, Sendable {

    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        // Vapor handles X-Forwarded-For via app.middleware.use(...)
        // This middleware adds X-Real-IP support for logging
        if let realIP = request.headers.first(name: "X-Real-IP") {
            request.logger[metadataKey: "client_ip"] = .string(realIP)
        } else if let forwarded = request.headers.first(name: "X-Forwarded-For") {
            let ip = forwarded.split(separator: ",").first.map(String.init) ?? forwarded
            request.logger[metadataKey: "client_ip"] = .string(ip.trimmingCharacters(in: .whitespaces))
        }

        return try await next.respond(to: request)
    }
}
