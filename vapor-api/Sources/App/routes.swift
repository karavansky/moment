import Vapor

func routes(_ app: Application) throws {
    let api = app.grouped("api")

    // Public routes (no auth required)
    try api.register(collection: HealthController())
    try api.register(collection: VersionController())
    try api.register(collection: PhotonController())
    try api.register(collection: RoutingController())
    try api.register(collection: TestController())
    
    // Partially public (validate route is public, create is protected)
    try api.register(collection: InviteController())
    
    // Partially public (vapid-key is public)
    try api.register(collection: PushController())

    // FileController with custom middleware (public for demo paths, protected otherwise)
    let fileAuth = api.grouped(FileAuthMiddleware())
    try fileAuth.register(collection: FileController())

    // Protected routes (JWT auth required)
    let protected = api.grouped(JWTAuthMiddleware())
    try protected.register(collection: UploadController())
    // Load test endpoint WITH JWT auth overhead
    protected.get("test", "vapor-auth", use: TestController().vaporAuthTest)


    // Scheduling routes (all under /api/scheduling/*)
    try protected.register(collection: SchedulingController())        // GET /api/scheduling
    try protected.register(collection: AppointmentController())       // CRUD /api/scheduling/appointments
    try protected.register(collection: WorkerController())            // CRUD /api/scheduling/workers
    try protected.register(collection: ClientController())            // CRUD /api/scheduling/clients
    try protected.register(collection: TeamController())              // CRUD /api/scheduling/teams
    try protected.register(collection: GroupeController())            // CRUD /api/scheduling/groupes
    try protected.register(collection: ServiceController())           // CRUD /api/scheduling/services
    try protected.register(collection: SchedulingReportController())  // GET/POST /api/scheduling/reports

    // Transport routes (all under /api/transport/*)
    try protected.register(collection: OrdersController())            // CRUD /api/transport/orders
    try protected.register(collection: VehiclesController())          // CRUD /api/transport/vehicles
    try protected.register(collection: TransportRoutesController())   // CRUD /api/transport/routes
    try protected.register(collection: RejectReasonsController())     // CRUD /api/transport/reject-reasons

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

    app.logger.info("Routes registered: /api/health, /api/version, /api/photon, /api/scheduling/**, /api/transport/**, /api/reports/**, /api/tickets/**, /api/admin/**, etc.")
}
