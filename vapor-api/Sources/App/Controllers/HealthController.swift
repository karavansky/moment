import Vapor

/// Simple health check controller for Docker health checks and monitoring.
struct HealthController: RouteCollection, Sendable {

    func boot(routes: any RoutesBuilder) throws {
        routes.get("health", use: check)
    }

    @Sendable
    func check(req: Request) async throws -> HealthResponse {
        return HealthResponse(status: "ok", timestamp: Date().ISO8601Format())
    }
}

struct HealthResponse: Content, Sendable {
    let status: String
    let timestamp: String
}
