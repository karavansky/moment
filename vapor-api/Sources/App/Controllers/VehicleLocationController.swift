import Vapor
import Fluent
import FluentPostgresDriver
import Foundation

/// Lightweight endpoint for updating vehicle GPS coordinates
/// POST /api/transport/location - allows any authenticated user (drivers)
struct VehicleLocationController: RouteCollection {
    // Simple in-memory cache for OSRM results
    // Note: In production, use a proper cache like Redis for thread-safety and persistence
    // Thread-safety is ensured by cacheLock - all access to osrmCache is protected by the lock
    private static let cacheLock = NSLock()
    private nonisolated(unsafe) static var osrmCache: [String: (lat: Double, lng: Double, timestamp: Date)] = [:]
    private static let cacheLifetime: TimeInterval = 60 // 60 seconds
    private static let cacheGridSize: Double = 0.0001 // ~11 meters

    func boot(routes: any RoutesBuilder) throws {
        let location = routes.grouped("transport", "location")
        location.post(use: updateLocation)
    }

    // MARK: - OSRM Cache
    /// Round coordinates to grid for caching
    private static func roundToGrid(_ value: Double) -> Double {
        return (value / cacheGridSize).rounded() * cacheGridSize
    }

    /// Get cached OSRM result if available and fresh
    private static func getCachedOSRMStatic(lat: Double, lng: Double) -> (lat: Double, lng: Double)? {
        cacheLock.lock()
        defer { cacheLock.unlock() }

        let key = "\(roundToGrid(lat)),\(roundToGrid(lng))"
        if let cached = osrmCache[key],
           Date().timeIntervalSince(cached.timestamp) < cacheLifetime {
            return (lat: cached.lat, lng: cached.lng)
        }
        return nil
    }

    /// Store OSRM result in cache
    private static func setCachedOSRMStatic(originalLat: Double, originalLng: Double, snappedLat: Double, snappedLng: Double) {
        cacheLock.lock()
        defer { cacheLock.unlock() }

        let key = "\(roundToGrid(originalLat)),\(roundToGrid(originalLng))"
        osrmCache[key] = (lat: snappedLat, lng: snappedLng, timestamp: Date())

        // Simple cleanup: remove old entries if cache grows too large
        if osrmCache.count > 1000 {
            let cutoff = Date().addingTimeInterval(-cacheLifetime)
            osrmCache = osrmCache.filter { $0.value.timestamp > cutoff }
        }
    }

    // MARK: - OSRM Nearest (Snap to Road)
    /// Snap GPS coordinates to nearest road using OSRM Nearest API
    private func snapToRoad(lat: Double, lng: Double, osrmURL: String, req: Request) async throws -> (lat: Double, lng: Double)? {
        return try await Self.snapToRoadStatic(lat: lat, lng: lng, osrmURL: osrmURL, req: req)
    }

    /// Static version of snapToRoad for use by other controllers
    static func snapToRoadStatic(lat: Double, lng: Double, osrmURL: String, req: Request) async throws -> (lat: Double, lng: Double)? {
        // TEMPORARY: Disable cache for debugging
        // Check cache first
        // if let cached = getCachedOSRMStatic(lat: lat, lng: lng) {
        //     req.logger.trace("[OSRM] Cache hit")
        //     return cached
        // }

        let url = "\(osrmURL)/nearest/v1/driving/\(lng),\(lat)?number=1"

        do {
            let response = try await req.client.get(URI(string: url))

            guard response.status == .ok else {
                req.logger.debug("[OSRM] Non-OK status: \(response.status)")
                return nil
            }

            struct OSRMResponse: Decodable {
                let code: String
                let waypoints: [Waypoint]?

                struct Waypoint: Decodable {
                    let location: [Double]
                    let distance: Double?
                }
            }

            let osrmResponse = try response.content.decode(OSRMResponse.self)

            if osrmResponse.code == "Ok",
               let waypoints = osrmResponse.waypoints,
               let first = waypoints.first {
                let snappedLng = first.location[0]
                let snappedLat = first.location[1]
                let dist = distanceStatic(lat1: lat, lng1: lng, lat2: snappedLat, lng2: snappedLng)

                // Only use snapped coordinates if distance is reasonable (< 50m)
                if dist < 50 {
                    // TEMPORARY: Disable cache for debugging
                    // Cache the result
                    // setCachedOSRMStatic(originalLat: lat, originalLng: lng, snappedLat: snappedLat, snappedLng: snappedLng)
                    return (lat: snappedLat, lng: snappedLng)
                } else {
                    req.logger.debug("[OSRM] Snapped point too far: \(String(format: "%.1f", dist))m")
                    return nil
                }
            }

            return nil
        } catch {
            req.logger.error("[OSRM] Request failed: \(error)")
            return nil
        }
    }

    /// Calculate approximate distance between two coordinates in meters (Haversine formula)
    private static func distanceStatic(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
        let R = 6371000.0 // Earth radius in meters
        let dLat = (lat2 - lat1) * .pi / 180.0
        let dLng = (lng2 - lng1) * .pi / 180.0
        let a = sin(dLat/2) * sin(dLat/2) +
                cos(lat1 * .pi / 180.0) * cos(lat2 * .pi / 180.0) *
                sin(dLng/2) * sin(dLng/2)
        let c = 2 * atan2(sqrt(a), sqrt(1-a))
        return R * c
    }

    // MARK: - POST /api/transport/location
    /// Update vehicle GPS coordinates (for drivers)
    func updateLocation(req: Request) async throws -> Response {
        // Allow any authenticated user (not just directors)
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden)
        }

        struct Body: Content {
            var vehicleID: String
            var latitude: Double
            var longitude: Double
        }

        let body = try req.content.decode(Body.self)

        // Try to snap to road using OSRM
        let osrmURL = Environment.get("OSRM_URL") ?? "http://osrm:5000"

        var finalLat = body.latitude
        var finalLng = body.longitude
        var wasSnapped = false

        if let snapped = try await snapToRoad(lat: body.latitude, lng: body.longitude, osrmURL: osrmURL, req: req) {
            finalLat = snapped.lat
            finalLng = snapped.lng
            wasSnapped = true
        }

        // Use raw SQL UPDATE for better performance (single DB operation instead of find + save)
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
            req.logger.warning("[GPS] Vehicle not found: \(body.vehicleID)")
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        let vehicleID = try row.decode(column: "vehicleID", as: String.self)
        let plateNumber = try row.decode(column: "plateNumber", as: String.self)
        let updatedLat = try row.decode(column: "currentLat", as: Double.self)
        let updatedLng = try row.decode(column: "currentLng", as: Double.self)
        let updatedTime = try row.decode(column: "lastLocationUpdate", as: Date.self)

        // Log only important events (debug level for regular updates)
        req.logger.debug("[GPS] Updated \(plateNumber): (\(String(format: "%.6f", updatedLat)), \(String(format: "%.6f", updatedLng))) snapped=\(wasSnapped)")

        struct ResponseDTO: Content {
            var success: Bool
            var vehicleID: String
            var currentLat: Double
            var currentLng: Double
            var lastLocationUpdate: Date
            var wasSnapped: Bool
        }

        let dto = ResponseDTO(
            success: true,
            vehicleID: vehicleID,
            currentLat: updatedLat,
            currentLng: updatedLng,
            lastLocationUpdate: updatedTime,
            wasSnapped: wasSnapped
        )

        return try await dto.encodeResponse(for: req)
    }
}
