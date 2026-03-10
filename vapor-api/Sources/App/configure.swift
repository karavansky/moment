import Vapor
import Fluent
import FluentPostgresDriver
import Redis

func configure(_ app: Application) async throws {
    // ====== Database ======
    // DATABASE_URL format: postgres://user:password@host:port/dbname
    guard let databaseURL = Environment.get("DATABASE_URL") else {
        fatalError("DATABASE_URL environment variable is required")
    }
    // 4 connections per event loop × ~4 loops = ~16 DB connections max (PostgreSQL default limit: 100)
    try app.databases.use(.postgres(url: databaseURL, maxConnectionsPerEventLoop: 4), as: .psql)

    // ====== Redis ======
    let redisHost = Environment.get("REDIS_HOST") ?? "127.0.0.1"
    let redisPort = Int(Environment.get("REDIS_PORT") ?? "6379") ?? 6379
    app.redis.configuration = try RedisConfiguration(
        hostname: redisHost,
        port: redisPort,
        pool: .init(
            maximumConnectionCount: .maximumActiveConnections(8),
            minimumConnectionCount: 2
        )
    )
    app.logger.info("Redis configured: \(redisHost):\(redisPort)")

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
