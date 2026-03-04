import Vapor

func routes(_ app: Application) throws {
    let api = app.grouped("api")

    // Public routes (no auth)
    try api.register(collection: HealthController())

    // Protected routes (JWT auth required)
    let protected = api.grouped(JWTAuthMiddleware())
    try protected.register(collection: FileController())

    // Admin routes (JWT auth + isAdmin required)
    let admin = protected.grouped(AdminMiddleware())
    try admin.register(collection: SeaweedProxyController())

    app.logger.info("Routes registered: /api/health, /api/files/**, /api/seaweed-proxy/**")
}
