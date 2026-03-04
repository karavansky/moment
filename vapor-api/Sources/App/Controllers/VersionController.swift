import Vapor

/// Controller for exposing backend version: GET /api/version
struct VersionController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        routes.get("version", use: getVersion)
    }

    func getVersion(req: Request) async throws -> Response {
        // You can read from environment, Info.plist, or hardcode
        let version = Environment.get("APP_VERSION") ?? "1.0.0 (Vapor)"
        return try await ["version": version].encodeResponse(for: req)
    }
}
