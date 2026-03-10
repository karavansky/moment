import Vapor
import Redis
import Crypto

/// Controller for OSRM routing with Redis caching: GET /api/routing
/// Caches routes for 7 days to reduce OSRM load and improve performance
struct RoutingController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let routing = routes.grouped("routing")
        routing.get(use: getRoute)
    }

    // GET /api/routing?coordinates=6.9603,50.9375;6.9451,50.9288
    // GET /api/routing?start=6.9603,50.9375&end=6.9451,50.9288
    func getRoute(req: Request) async throws -> Response {
        // Parse parameters (support both formats)
        let coordinates: String
        if let coords = req.query[String.self, at: "coordinates"] {
            coordinates = coords
        } else if let start = req.query[String.self, at: "start"],
                  let end = req.query[String.self, at: "end"] {
            coordinates = "\(start);\(end)"
        } else {
            throw Abort(.badRequest, reason: "Missing required parameters: coordinates or start + end")
        }

        // Create cache key (normalize coordinates to 4 decimal places)
        let cacheKey = createCacheKey(coordinates: coordinates)
        let redis = req.redis

        // Try to get from cache
        do {
            if let cachedData = try await redis.get(RedisKey(cacheKey), asJSON: OSRMResponse.self) {
                req.logger.info("✅ Cache hit for: \(coordinates)")

                // Return cached response with metadata
                var response = Response(status: .ok)
                let wrappedData = CachedOSRMResponse(
                    routes: cachedData.routes,
                    waypoints: cachedData.waypoints,
                    code: cachedData.code,
                    _cached: true,
                    _cacheKey: cacheKey
                )
                try response.content.encode(wrappedData, as: .json)
                return response
            }
        } catch {
            req.logger.warning("⚠️  Redis unavailable, skipping cache: \(error)")
        }

        req.logger.info("❌ Cache miss for: \(coordinates)")

        // Get OSRM URL from environment
        let osrmURL = Environment.get("OSRM_URL") ?? "http://localhost:5000"
        let urlString = "\(osrmURL)/route/v1/driving/\(coordinates)?overview=full&geometries=geojson"

        req.logger.info("🗺️  OSRM request: \(urlString)")

        // Fetch from OSRM with timeout
        let clientResponse: ClientResponse
        do {
            clientResponse = try await req.client.get(URI(string: urlString))
        } catch {
            req.logger.error("❌ OSRM connection error: \(error)")

            // Try fallback to public OSRM
            return try await fallbackToPublicOSRM(req: req, coordinates: coordinates, cacheKey: cacheKey)
        }

        guard clientResponse.status == .ok else {
            req.logger.error("❌ OSRM responded with status: \(clientResponse.status)")
            return try await fallbackToPublicOSRM(req: req, coordinates: coordinates, cacheKey: cacheKey)
        }

        // Parse OSRM response
        guard let data = try? clientResponse.content.decode(OSRMResponse.self) else {
            req.logger.error("❌ Failed to decode OSRM response")
            throw Abort(.internalServerError, reason: "Failed to parse OSRM response")
        }

        guard data.code == "Ok" else {
            req.logger.error("❌ OSRM error: \(data.code)")
            throw Abort(.badRequest, reason: "OSRM error: \(data.code)")
        }

        req.logger.info("✅ OSRM response: routes=\(data.routes?.count ?? 0), distance=\(data.routes?.first?.distance ?? 0), duration=\(data.routes?.first?.duration ?? 0)")

        // Cache the response (7 days TTL)
        do {
            try await redis.setex(RedisKey(cacheKey), toJSON: data, expirationInSeconds: 7 * 24 * 60 * 60)
            req.logger.info("💾 Cached route: \(cacheKey)")
        } catch {
            req.logger.warning("⚠️  Failed to cache route: \(error)")
        }

        // Return response with metadata
        var response = Response(status: .ok)
        let wrappedData = CachedOSRMResponse(
            routes: data.routes,
            waypoints: data.waypoints,
            code: data.code,
            _cached: false,
            _cacheKey: cacheKey
        )
        try response.content.encode(wrappedData, as: .json)
        return response
    }

    // Fallback to public OSRM server
    private func fallbackToPublicOSRM(req: Request, coordinates: String, cacheKey: String) async throws -> Response {
        let fallbackURL = "https://router.project-osrm.org/route/v1/driving/\(coordinates)?overview=full&geometries=geojson"
        req.logger.info("🔄 Trying fallback OSRM: \(fallbackURL)")

        let clientResponse = try await req.client.get(URI(string: fallbackURL))
        guard let data = try? clientResponse.content.decode(OSRMResponse.self) else {
            throw Abort(.serviceUnavailable, reason: "Routing service unavailable")
        }

        // Cache fallback response
        do {
            try await req.redis.setex(RedisKey(cacheKey), toJSON: data, expirationInSeconds: 7 * 24 * 60 * 60)
            req.logger.info("💾 Cached fallback route: \(cacheKey)")
        } catch {
            req.logger.warning("⚠️  Failed to cache fallback route: \(error)")
        }

        // Return response with fallback metadata
        var response = Response(status: .ok)
        let wrappedData = FallbackOSRMResponse(
            routes: data.routes,
            waypoints: data.waypoints,
            code: data.code,
            _fallback: true,
            _cached: false,
            _cacheKey: cacheKey,
            _message: "Using public OSRM server"
        )
        try response.content.encode(wrappedData, as: .json)
        return response
    }

    // Create cache key from coordinates (normalize and hash)
    private func createCacheKey(coordinates: String) -> String {
        // Normalize coordinates (round to 4 decimal places)
        let normalized = coordinates
            .split(separator: ";")
            .map { coord -> String in
                let parts = coord.split(separator: ",").map { Double(String($0)) ?? 0.0 }
                return parts.map { String(format: "%.4f", $0) }.joined(separator: ",")
            }
            .joined(separator: ";")

        // Hash for compactness
        let hash = Insecure.MD5.hash(data: Data(normalized.utf8))
            .map { String(format: "%02x", $0) }
            .joined()

        return "osrm:route:\(hash)"
    }
}

// MARK: - Models

struct OSRMResponse: Content {
    let code: String
    let routes: [OSRMRoute]?
    let waypoints: [OSRMWaypoint]?
}

struct OSRMRoute: Content {
    let distance: Double
    let duration: Double
    let geometry: GeoJSONGeometry
}

struct OSRMWaypoint: Content {
    let name: String?
    let location: [Double]
}

struct GeoJSONGeometry: Content {
    let type: String
    let coordinates: [[Double]]
}

struct CachedOSRMResponse: Content {
    let routes: [OSRMRoute]?
    let waypoints: [OSRMWaypoint]?
    let code: String
    let _cached: Bool
    let _cacheKey: String
}

struct FallbackOSRMResponse: Content {
    let routes: [OSRMRoute]?
    let waypoints: [OSRMWaypoint]?
    let code: String
    let _fallback: Bool
    let _cached: Bool
    let _cacheKey: String
    let _message: String
}
