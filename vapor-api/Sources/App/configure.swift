import Vapor
import Fluent
import FluentPostgresDriver

func configure(_ app: Application) async throws {
    // ====== Database ======
    // DATABASE_URL format: postgres://user:password@host:port/dbname
    guard let databaseURL = Environment.get("DATABASE_URL") else {
        fatalError("DATABASE_URL environment variable is required")
    }
    try app.databases.use(.postgres(url: databaseURL), as: .psql)

    // ====== Server Config ======
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = Int(Environment.get("PORT") ?? "8080") ?? 8080

    // ====== Middleware ======
    // Clear default middleware and add our own
    app.middleware = .init()
    app.middleware.use(ErrorMiddleware.default(environment: app.environment))
    app.middleware.use(RealIPMiddleware())

    // CORS — allow requests from the frontend
    let corsConfig = CORSMiddleware.Configuration(
        allowedOrigin: .any(["https://moment-lbs.app", "https://dev.moment-lbs.app", "http://localhost:3002"]),
        allowedMethods: [.GET, .POST, .PUT, .DELETE, .PATCH, .OPTIONS],
        allowedHeaders: [.authorization, .contentType, .accept, .origin, .xRequestedWith],
        allowCredentials: true
    )
    app.middleware.use(CORSMiddleware(configuration: corsConfig))

    // ====== Routes ======
    try routes(app)

    app.logger.info("Vapor API configured successfully")
}
