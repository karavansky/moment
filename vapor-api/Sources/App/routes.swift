import Vapor

func routes(_ app: Application) throws {
    let api = app.grouped("api")

    // Public routes (no auth required)
    try api.register(collection: HealthController())
    try api.register(collection: VersionController())
    try api.register(collection: PhotonController())
    
    // Partially public (validate route is public, create is protected)
    try api.register(collection: InviteController())
    
    // Partially public (vapid-key is public)
    try api.register(collection: PushController())

    // Protected routes (JWT auth required)
    let protected = api.grouped(JWTAuthMiddleware())
    try protected.register(collection: FileController())

    // Scheduling routes (all under /api/scheduling/*)
    try protected.register(collection: SchedulingController())        // GET /api/scheduling
    try protected.register(collection: AppointmentController())       // CRUD /api/scheduling/appointments
    try protected.register(collection: WorkerController())            // CRUD /api/scheduling/workers
    try protected.register(collection: ClientController())            // CRUD /api/scheduling/clients
    try protected.register(collection: TeamController())              // CRUD /api/scheduling/teams
    try protected.register(collection: GroupeController())            // CRUD /api/scheduling/groupes
    try protected.register(collection: ServiceController())           // CRUD /api/scheduling/services
    try protected.register(collection: SchedulingReportController())  // GET/POST /api/scheduling/reports

    // Other protected routes
    try protected.register(collection: ReportController())            // CRUD /api/reports + photos
    try protected.register(collection: TicketController())            // /api/tickets
    try protected.register(collection: SettingsController())          // /api/settings
    try protected.register(collection: LocationController())          // /api/location
    try protected.register(collection: StaffController())             // /api/staff

    // Admin routes (JWT auth + isAdmin required)
    let admin = protected.grouped(AdminMiddleware())
    try admin.register(collection: SeaweedProxyController())
    try admin.register(collection: AdminController())

    app.logger.info("Routes registered: /api/health, /api/version, /api/photon, /api/scheduling/**, /api/reports/**, /api/tickets/**, /api/admin/**, etc.")
}
