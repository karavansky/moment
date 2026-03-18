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

    /// Calculate bearing (direction) from point 1 to point 2 in degrees (0-360)
    private func calculateBearing(lat1: Double, lng1: Double, lat2: Double, lng2: Double) -> Double {
        let lat1Rad = lat1 * .pi / 180.0
        let lat2Rad = lat2 * .pi / 180.0
        let dLng = (lng2 - lng1) * .pi / 180.0

        let y = sin(dLng) * cos(lat2Rad)
        let x = cos(lat1Rad) * sin(lat2Rad) -
                sin(lat1Rad) * cos(lat2Rad) * cos(dLng)

        let bearingRad = atan2(y, x)
        let bearingDeg = bearingRad * 180.0 / .pi

        // Normalize to 0-360
        return (bearingDeg + 360.0).truncatingRemainder(dividingBy: 360.0)
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

        guard let sql = req.db as? SQLDatabase else {
            throw Abort(.internalServerError, reason: "Database does not support SQL")
        }

        // SERVER-SIDE VALIDATION: Get last position from DB
        let lastPosition = try await sql.raw("""
            SELECT "currentLat", "currentLng", "lastLocationUpdate"
            FROM vehicles
            WHERE "vehicleID" = \(bind: body.vehicleID)
              AND "firmaID" = \(bind: firmaID)
            """).first()

        guard let lastRow = lastPosition else {
            req.logger.warning("[GPS] Vehicle not found: \(body.vehicleID)")
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        // Validate GPS point against last known position
        var bearing: Double? = nil
        var speed: Double? = nil

        if let lastLat = try? lastRow.decode(column: "currentLat", as: Double.self),
           let lastLng = try? lastRow.decode(column: "currentLng", as: Double.self),
           let lastUpdate = try? lastRow.decode(column: "lastLocationUpdate", as: Date.self) {

            // Calculate distance and time delta
            let dist = Self.distanceStatic(lat1: lastLat, lng1: lastLng,
                                          lat2: body.latitude, lng2: body.longitude)
            let timeDelta = Date().timeIntervalSince(lastUpdate)

            // SERVER-SIDE BUSINESS RULE: Maximum realistic distance based on time
            // At 130 km/h (highway speed), in 1 second you travel ~36 meters
            // We allow up to 150 km/h as absolute maximum (42m/sec)
            let maxDistancePerSecond = 42.0 // meters (150 km/h)
            let maxRealisticDist = maxDistancePerSecond * max(timeDelta, 1.0)

            if dist > maxRealisticDist {
                req.logger.warning("[GPS] 🚫 Suspicious GPS jump detected: \(String(format: "%.1f", dist))m in \(String(format: "%.1f", timeDelta))s (max: \(String(format: "%.1f", maxRealisticDist))m)")
                throw Abort(.badRequest, reason: "Invalid GPS point: unrealistic movement")
            }

            // Calculate bearing (server-side, hidden from client)
            if dist > 3.0 { // Only calculate if moved more than 3 meters
                bearing = calculateBearing(lat1: lastLat, lng1: lastLng,
                                          lat2: body.latitude, lng2: body.longitude)
            }

            // Calculate speed (server-side, hidden from client)
            if timeDelta > 0 {
                speed = (dist / 1000.0) / (timeDelta / 3600.0) // km/h
            }

            req.logger.debug("[GPS] ✅ Validated: dist=\(String(format: "%.1f", dist))m, time=\(String(format: "%.1f", timeDelta))s, speed=\(String(format: "%.1f", speed ?? 0))km/h, bearing=\(String(format: "%.1f", bearing ?? 0))°")
        }

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

        // Update vehicle position
        let timestamp = Date()

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
            req.logger.warning("[GPS] Vehicle not found after update: \(body.vehicleID)")
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
            var bearing: Double?  // Server-calculated bearing (hidden business logic)
            var speed: Double?    // Server-calculated speed in km/h (hidden business logic)
        }

        let dto = ResponseDTO(
            success: true,
            vehicleID: vehicleID,
            currentLat: updatedLat,
            currentLng: updatedLng,
            lastLocationUpdate: updatedTime,
            wasSnapped: wasSnapped,
            bearing: bearing,
            speed: speed
        )

        return try await dto.encodeResponse(for: req)
    }
}
