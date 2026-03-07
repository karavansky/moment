import Fluent
import FluentPostgresDriver
import Vapor
import Redis

/// Configure the application: DB, migrations, WebSocket manager, routes.
public func configure(_ app: Application) async throws {
    // Set custom port to avoid conflicts
    app.http.server.configuration.hostname = "0.0.0.0"
    app.http.server.configuration.port = 3003

    // Enable HTTP request decompression
    //app.http.server.configuration.requestDecompression = .enabled

    // Enable CORS for cross-origin requests
    let corsConfiguration = CORSMiddleware.Configuration(
        allowedOrigin: .all,
        allowedMethods: [.GET, .POST, .PUT, .OPTIONS, .DELETE, .PATCH],
        allowedHeaders: [
            .accept, .authorization, .contentType, .origin, .xRequestedWith, .userAgent,
            .accessControlAllowOrigin, .init("X-Session-ID"),
        ]
    )
    app.middleware.use(CORSMiddleware(configuration: corsConfiguration))

    // Serve static files from Public/ directory
    app.middleware.use(FileMiddleware(publicDirectory: app.directory.publicDirectory))

    // STAGE 2: PostgreSQL only - SQLite removed
    let postgresConfig = SQLPostgresConfiguration(
        hostname: "localhost",
        port: 5432,
        username: "hronop",
        password: "Sk02081978",
        database: "monitor",
        tls: .disable
    )
    // Configure connection pooling for better performance
    app.databases.use(
        .postgres(
            configuration: postgresConfig,
            maxConnectionsPerEventLoop: 4,  // 4 connections per event loop
            connectionPoolTimeout: .seconds(30)
        ),
        as: .psql
    )

    // Migrations for PostgreSQL only
    app.migrations.add(CreateUsers(), to: .psql)
    app.migrations.add(AddLastActivityToUsers(), to: .psql)
    app.migrations.add(MakeUserTokenOptional(), to: .psql)
    app.migrations.add(AddUniqueUsernameConstraint(), to: .psql)  // Must be before CreateSession for FK
    app.migrations.add(AddHostToUsers(), to: .psql)  // Add host field to users table
    app.migrations.add(CreateMessages(), to: .psql)
    app.migrations.add(CreateUserStatusHistory(), to: .psql)
    app.migrations.add(CreateSession(), to: .psql)

    // Skip auto-migrate if tables already exist
    // To run migrations manually: swift run WebSocketServer migrate
    try await app.autoMigrate()

    // Configure Redis with larger connection pool for high load
    app.redis.configuration = try RedisConfiguration(
        hostname: "localhost",
        port: 6379,
        pool: RedisConfiguration.PoolOptions(
            maximumConnectionCount: .maximumActiveConnections(64),  // Support up to 64 concurrent connections
            minimumConnectionCount: 4,
            connectionRetryTimeout: .seconds(30)
        )
    )

    // Initialize SessionManager with Application
    let sessionManager = SessionManager(app: app)
    app.sessionManager = sessionManager

    // Initialize UserStatusCache
    let userStatusCache = UserStatusCache(redis: app.redis)
    app.userStatusCache = userStatusCache

    print("✅ Redis connected at localhost:6379")

    // WebSocket Manager
    let wsManager: WebSocketManager = WebSocketManager()
    app.storage[WebSocketManagerKey.self] = wsManager

    // Start ping timer to send ping to all clients every 20 seconds
    // This will validate active connections and clean up dead ones
    wsManager.startPingTimer(on: app.eventLoopGroup.next(), database: app.db, userStatusCache: userStatusCache, sessionManager: sessionManager)

    // Start cleanup timer to mark stale online users as offline every 5 minutes
    // This handles users marked online but with no active WebSocket connections
    // (e.g., after server restart when WebSocketManager is empty but DB shows users online)
    wsManager.startStaleUserCleanup(on: app.eventLoopGroup.next(), database: app.db)

    // Note: Redis handles session expiration automatically via TTL
    // No need for manual cleanup timer

    // register routes
    try routes(app)
}

extension Application {
    var wsManager: WebSocketManager {
        guard let manager: WebSocketManagerKey.Value = storage[WebSocketManagerKey.self] else {
            fatalError("WebSocketManager not configured")
        }
        return manager
    }
}
