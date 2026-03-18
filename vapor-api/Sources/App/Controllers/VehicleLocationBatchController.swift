import Vapor
import Fluent
import FluentPostgresDriver

struct VehicleLocationBatchController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let batch = routes.grouped("transport", "location", "batch")
        batch.post(use: updateBatch)
    }

    struct LocationPoint: Content {
        var latitude: Double
        var longitude: Double
        var timestamp: String  // ISO 8601 timestamp from client
    }

    struct BatchBody: Content {
        var vehicleID: String
        var locations: [LocationPoint]
    }

    struct BatchResponse: Content {
        var success: Bool
        var vehicleID: String
        var processedCount: Int
        var currentLat: Double?
        var currentLng: Double?
        var lastLocationUpdate: Date?
        var wasSnapped: Bool
    }

    // POST /api/transport/location/batch
    func updateBatch(req: Request) async throws -> BatchResponse {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden)
        }

        let body = try req.content.decode(BatchBody.self)

        if body.locations.isEmpty {
            throw Abort(.badRequest, reason: "locations array cannot be empty")
        }

        // Sort locations by timestamp (oldest first)
        let sortedLocations = body.locations.sorted { loc1, loc2 in
            guard let date1 = ISO8601DateFormatter().date(from: loc1.timestamp),
                  let date2 = ISO8601DateFormatter().date(from: loc2.timestamp) else {
                return false
            }
            return date1 < date2
        }

        // Process only the latest location (most recent)
        // We could process all points, but for efficiency we just use the latest
        // The client has already calculated bearing/speed from the sequence
        let latestLocation = sortedLocations.last!

        let osrmURL = Environment.get("OSRM_URL") ?? "http://osrm:5000"

        var finalLat = latestLocation.latitude
        var finalLng = latestLocation.longitude
        var wasSnapped = false

        // Try to snap to road using OSRM
        if let snapped = try await VehicleLocationController.snapToRoadStatic(
            lat: latestLocation.latitude,
            lng: latestLocation.longitude,
            osrmURL: osrmURL,
            req: req
        ) {
            finalLat = snapped.lat
            finalLng = snapped.lng
            wasSnapped = true
        }

        // Update using raw SQL for performance (single DB operation)
        let timestamp = Date()

        guard let sql = req.db as? SQLDatabase else {
            throw Abort(.internalServerError, reason: "Database does not support SQL")
        }

        let updated = try await sql.raw("""
            UPDATE vehicles
            SET "currentLat" = \(bind: finalLat),
                "currentLng" = \(bind: finalLng),
                "lastLocationUpdate" = \(bind: timestamp)
            WHERE "vehicleID" = \(bind: body.vehicleID)
              AND "firmaID" = \(bind: firmaID)
            RETURNING "vehicleID", "plateNumber", "currentLat", "currentLng", "lastLocationUpdate"
            """).first()

        guard let row = updated else {
            req.logger.warning("[GPS Batch] Vehicle not found: \(body.vehicleID)")
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        let vehicleID = try row.decode(column: "vehicleID", as: String.self)
        let plateNumber = try row.decode(column: "plateNumber", as: String.self)
        let updatedLat = try row.decode(column: "currentLat", as: Double.self)
        let updatedLng = try row.decode(column: "currentLng", as: Double.self)
        let updatedTime = try row.decode(column: "lastLocationUpdate", as: Date.self)

        // Log batch update
        req.logger.debug("[GPS Batch] Updated \(plateNumber): \(body.locations.count) points → (\(String(format: "%.6f", updatedLat)), \(String(format: "%.6f", updatedLng))) snapped=\(wasSnapped)")

        return BatchResponse(
            success: true,
            vehicleID: vehicleID,
            processedCount: body.locations.count,
            currentLat: updatedLat,
            currentLng: updatedLng,
            lastLocationUpdate: updatedTime,
            wasSnapped: wasSnapped
        )
    }
}
