import Vapor
import NIOCore

/// Controller for geocoding proxy: GET /api/photon, GET /api/photon/reverse
/// Proxies requests to Photon/Komoot API to avoid CORS issues and expose a unified API
struct PhotonController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let photon = routes.grouped("photon")
        photon.get(use: search)
        photon.get("reverse", use: reverse)
    }

    // GET /api/photon?q=Berlin&limit=5&country=DE
    func search(req: Request) async throws -> Response {
        guard let query = req.query[String.self, at: "q"] else {
            throw Abort(.badRequest, reason: "Missing query parameter 'q'")
        }
        let limit = req.query[Int.self, at: "limit"] ?? 5
        let lang = req.query[String.self, at: "lang"] ?? "de"
        let lat = req.query[Double.self, at: "lat"]
        let lon = req.query[Double.self, at: "lon"]
        let country = req.query[String.self, at: "country"]  // Get country filter for post-processing

        // Request more results if country filter is specified (3x limit, max 50)
        let requestLimit = country != nil ? min(limit * 3, 50) : limit

        var urlString = "https://photon.komoot.io/api/?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)&limit=\(requestLimit)&lang=\(lang)"

        if let lat = lat, let lon = lon {
            urlString += "&lat=\(lat)&lon=\(lon)"
        }

        req.logger.info("[Photon] Request: q=\(query), country=\(country ?? "none"), limit=\(limit)")

        let clientRes = try await req.client.get(URI(string: urlString))

        // Parse response and filter by country if specified
        if let country = country, let body = clientRes.body {
            let data = try JSONDecoder().decode(PhotonResponse.self, from: body)

            let countryUpper = country.uppercased()
            let beforeCount = data.features.count

            // Filter features by countrycode
            let filteredFeatures = data.features.filter { feature in
                feature.properties.countrycode?.uppercased() == countryUpper
            }

            req.logger.info("[Photon] Before filter: \(beforeCount) features")
            req.logger.info("[Photon] After filter: \(filteredFeatures.count) features for \(countryUpper)")

            // Trim to original limit
            let finalFeatures = Array(filteredFeatures.prefix(limit))

            let filteredResponse = PhotonResponse(type: data.type, features: finalFeatures)

            let response = Response(status: .ok)
            try response.content.encode(filteredResponse)
            return response
        }

        // No filtering - return as-is
        let response = Response(status: clientRes.status)
        if let body = clientRes.body {
            response.body = .init(buffer: body)
        }
        response.headers.contentType = .json
        return response
    }

    // GET /api/photon/reverse?lat=52.5&lon=13.4
    func reverse(req: Request) async throws -> Response {
        guard let lat = req.query[Double.self, at: "lat"],
              let lon = req.query[Double.self, at: "lon"] else {
            throw Abort(.badRequest, reason: "Missing lat/lon parameters")
        }
        let lang = req.query[String.self, at: "lang"] ?? "de"
        
        let urlString = "https://photon.komoot.io/reverse?lat=\(lat)&lon=\(lon)&lang=\(lang)"
        
        let clientRes = try await req.client.get(URI(string: urlString))
        
        let response = Response(status: clientRes.status)
        if let body = clientRes.body {
            response.body = .init(buffer: body)
        }
        response.headers.contentType = .json
        return response
    }
}

// MARK: - Photon Response Models
struct PhotonResponse: Content {
    let type: String
    let features: [PhotonFeature]
}

struct PhotonFeature: Codable {
    let type: String?
    let geometry: PhotonGeometry
    let properties: PhotonProperties
}

struct PhotonGeometry: Codable {
    let type: String
    let coordinates: [Double]
}

struct PhotonProperties: Codable {
    let name: String?
    let street: String?
    let housenumber: String?
    let postcode: String?
    let city: String?
    let country: String?
    let countrycode: String?
    let osm_id: Int64?
    let osm_type: String?
    let osm_key: String?
    let osm_value: String?
}
