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

    // GET /api/photon?q=Berlin&limit=5
    func search(req: Request) async throws -> Response {
        guard let query = req.query[String.self, at: "q"] else {
            throw Abort(.badRequest, reason: "Missing query parameter 'q'")
        }
        let limit = req.query[Int.self, at: "limit"] ?? 5
        let lang = req.query[String.self, at: "lang"] ?? "de"
        let lat = req.query[Double.self, at: "lat"]
        let lon = req.query[Double.self, at: "lon"]
        
        var urlString = "https://photon.komoot.io/api/?q=\(query.addingPercentEncoding(withAllowedCharacters: .urlQueryAllowed) ?? query)&limit=\(limit)&lang=\(lang)"
        
        if let lat = lat, let lon = lon {
            urlString += "&lat=\(lat)&lon=\(lon)"
        }
        
        let clientRes = try await req.client.get(URI(string: urlString))
        
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
