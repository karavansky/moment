import Vapor
import Foundation

/// Admin-only proxy to SeaweedFS Filer UI.
/// Port of `app/api/seaweed-proxy/[[...path]]/route.ts`.
struct SeaweedProxyController: RouteCollection, Sendable {

    func boot(routes: any RoutesBuilder) throws {
        let proxy = routes.grouped("seaweed-proxy")

        // Root: /api/seaweed-proxy/ (no path after — lists filer root)
        proxy.get(use: proxyGet)
        proxy.post(use: proxyMutate)
        proxy.delete(use: proxyMutate)

        // Sub-paths: /api/seaweed-proxy/buckets/... 
        proxy.get("**", use: proxyGet)
        proxy.post("**", use: proxyMutate)
        proxy.delete("**", use: proxyMutate)
    }

    /// GET proxy — fetches from SeaweedFS, rewrites HTML links for the admin UI.
    @Sendable
    func proxyGet(req: Request) async throws -> Response {
        let pathComponents = req.parameters.getCatchall()
        let pathStr = pathComponents.joined(separator: "/")
        let seaweedURL = seaweedFilerURL(path: pathStr, queryString: req.url.query)

        req.logger.info("[SeaweedProxy] GET \(seaweedURL)")

        // Fetch from SeaweedFS
        let clientResponse = try await req.client.get(URI(string: seaweedURL))

        guard let body = clientResponse.body else {
            return Response(status: clientResponse.status)
        }

        let contentType = clientResponse.headers.first(name: .contentType)?.lowercased() ?? ""

        // If HTML response, rewrite links for proxy path
        if contentType.contains("text/html") {
            var html = String(buffer: body)
            let proxyBasePath = "/api/seaweed-proxy"

            // Rewrite href/src/action with absolute paths
            // Regex: (href|src|action)="/<path>"
            let pattern = #"(href|src|action)\s*=\s*(["'])/([^"']*)\2"#
            if let regex = try? NSRegularExpression(pattern: pattern) {
                let range = NSRange(html.startIndex..., in: html)
                html = regex.stringByReplacingMatches(
                    in: html,
                    range: range,
                    withTemplate: "$1=$2\(proxyBasePath)/$3$2"
                )
            }

            // Rewrite JS handleDelete/handleRename functions
            html = html.replacingOccurrences(
                of: #"handleDelete\s*\(\s*'\\"#,
                with: "handleDelete('\\\(proxyBasePath)",
                options: .regularExpression
            )

            var headers = HTTPHeaders()
            headers.add(name: .contentType, value: "text/html")
            return Response(
                status: .ok,
                headers: headers,
                body: .init(string: html)
            )
        }

        // Non-HTML: stream through as-is
        var headers = HTTPHeaders()
        if let ct = clientResponse.headers.first(name: .contentType) {
            headers.add(name: .contentType, value: ct)
        }
        if let cl = clientResponse.headers.first(name: .contentLength) {
            headers.add(name: .contentLength, value: cl)
        }
        headers.add(name: .cacheControl, value: clientResponse.headers.first(name: .cacheControl) ?? "no-cache")

        return Response(
            status: clientResponse.status,
            headers: headers,
            body: .init(buffer: body)
        )
    }

    /// POST/DELETE proxy — forwards request body to SeaweedFS.
    @Sendable
    func proxyMutate(req: Request) async throws -> Response {
        let pathComponents = req.parameters.getCatchall()
        let pathStr = pathComponents.joined(separator: "/")
        let seaweedURL = seaweedFilerURL(path: pathStr, queryString: req.url.query)

        req.logger.info("[SeaweedProxy] \(req.method.rawValue) \(seaweedURL)")

        let uri = URI(string: seaweedURL)
        var headers = HTTPHeaders()

        // Pass Content-Type for form uploads
        if let contentType = req.headers.first(name: .contentType) {
            headers.add(name: .contentType, value: contentType)
        }

        let clientResponse: ClientResponse
        if req.method == .POST {
            clientResponse = try await req.client.post(uri, headers: headers) { clientReq in
                if let body = req.body.data {
                    clientReq.body = body
                }
            }
        } else {
            clientResponse = try await req.client.delete(uri, headers: headers)
        }

        return Response(
            status: clientResponse.status,
            body: clientResponse.body.map { .init(buffer: $0) } ?? .empty
        )
    }

    /// Constructs the SeaweedFS Filer URL from path and query string.
    private func seaweedFilerURL(path: String, queryString: String?) -> String {
        let base = Environment.get("SEAWEED_FILER_URL") ?? "http://127.0.0.1:8888"
        var url = "\(base)/\(path)"
        if let qs = queryString, !qs.isEmpty {
            url += "?\(qs)"
        }
        return url
    }
}
