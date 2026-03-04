import Vapor
import Fluent

/// Controller for tracking location: POST /api/location
struct LocationController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let location = routes.grouped("location")
        location.post(use: updateLocation)
    }

    func updateLocation(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var latitude: Double
            var longitude: Double
            var appointmentId: String? // Optional appointment to update
        }
        let body = try req.content.decode(Body.self)

        // 1. Update worker location
        if let worker = try await Worker.query(on: req.db)
            .filter(\.$userID == user.userId)
            .filter(\.$firmaID == firmaID)
            .first() {
            
            worker.latitude = body.latitude
            worker.longitude = body.longitude
            try await worker.save(on: req.db)
            pgNotify(req: req, firmaID: firmaID, type: "worker_updated")
        }

        // 2. Update appointment location if provided
        if let aptId = body.appointmentId,
           let appointment = try await Appointment.query(on: req.db)
            .filter(\.$id == aptId)
            .filter(\.$firmaID == firmaID)
            .first() {
            
            appointment.latitude = body.latitude
            appointment.longitude = body.longitude
            try await appointment.save(on: req.db)
            pgNotify(req: req, firmaID: firmaID, type: "appointment_updated")
        }

        return try await ["success": true].encodeResponse(status: .ok, for: req)
    }
}
