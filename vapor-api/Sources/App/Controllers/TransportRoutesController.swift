import Vapor
import Fluent

/// CRUD controller for transport routes: GET/POST/PUT/DELETE /api/transport/routes
/// Manages multi-stop routes for transport orders
struct TransportRoutesController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let transportRoutes = routes.grouped("transport", "routes")
        transportRoutes.get(use: index)
        transportRoutes.post(use: create)
        transportRoutes.put(use: update)
        transportRoutes.delete(use: remove)
    }

    // MARK: - GET /api/transport/routes
    /// Returns routes for an order or specific route by ID
    /// Query params: ?id=xxx, ?orderID=xxx
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let routeID = req.query[String.self, at: "id"]
        let orderID = req.query[String.self, at: "orderID"]

        // Handle single route fetch by ID
        if let routeID = routeID {
            guard let route = try await TransportRoute.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$id == routeID)
                .first() else {
                throw Abort(.notFound, reason: "Route not found")
            }

            let routeDTO = try TransportRouteDTO(from: route)

            let response = Response(status: .ok)
            try response.content.encode(["route": routeDTO], as: .json)
            return response
        }

        // Handle routes by orderID
        if let orderID = orderID {
            let routes = try await TransportRoute.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$orderID == orderID)
                .sort(\.$sequence, .ascending)
                .all()

            let routeDTOs = try routes.map { try TransportRouteDTO(from: $0) }

            let response = Response(status: .ok)
            try response.content.encode(["routes": routeDTOs], as: .json)
            return response
        }

        throw Abort(.badRequest, reason: "Either routeID or orderID parameter is required")
    }

    // MARK: - POST /api/transport/routes
    /// Create route(s) for an order
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can create routes
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can create routes")
        }

        struct RouteInput: Content {
            let id: String?
            let sequence: Int?
            let pickupAddress: String
            let dropoffAddress: String
            let pickupLat: Double?
            let pickupLng: Double?
            let dropoffLat: Double?
            let dropoffLng: Double?
        }

        struct CreateRoutesRequest: Content {
            let orderID: String
            let routes: [RouteInput]?
            // Single route fields (for backward compatibility)
            let pickupAddress: String?
            let dropoffAddress: String?
            let pickupLat: Double?
            let pickupLng: Double?
            let dropoffLat: Double?
            let dropoffLng: Double?
            let sequence: Int?
        }

        let input = try req.content.decode(CreateRoutesRequest.self)

        // Verify order exists
        let orderExists = try await Order.query(on: req.db)
            .filter(\.$id == input.orderID)
            .filter(\.$firmaID == firmaID)
            .first() != nil

        guard orderExists else {
            throw Abort(.notFound, reason: "Order not found")
        }

        var createdRoutes: [TransportRoute] = []

        // Handle multiple routes
        if let routesArray = input.routes, !routesArray.isEmpty {
            for (index, routeInput) in routesArray.enumerated() {
                let routeID = routeInput.id ?? String([UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21))
                let sequence = routeInput.sequence ?? (index + 1)

                let route = TransportRoute()
                route.id = routeID
                route.firmaID = firmaID
                route.orderID = input.orderID
                route.sequence = sequence
                route.pickupAddress = routeInput.pickupAddress
                route.dropoffAddress = routeInput.dropoffAddress
                route.pickupLat = routeInput.pickupLat
                route.pickupLng = routeInput.pickupLng
                route.dropoffLat = routeInput.dropoffLat
                route.dropoffLng = routeInput.dropoffLng
                route.createdAt = Date()

                try await route.save(on: req.db)
                createdRoutes.append(route)
            }

            let routeDTOs = try createdRoutes.map { try TransportRouteDTO(from: $0) }

            let response = Response(status: .created)
            try response.content.encode(["routes": routeDTOs], as: .json)
            return response

        } else {
            // Handle single route (backward compatibility)
            guard let pickupAddress = input.pickupAddress,
                  let dropoffAddress = input.dropoffAddress else {
                throw Abort(.badRequest, reason: "pickupAddress and dropoffAddress are required")
            }

            let routeID = String([UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21))

            let route = TransportRoute()
            route.id = routeID
            route.firmaID = firmaID
            route.orderID = input.orderID
            route.sequence = input.sequence ?? 1
            route.pickupAddress = pickupAddress
            route.dropoffAddress = dropoffAddress
            route.pickupLat = input.pickupLat
            route.pickupLng = input.pickupLng
            route.dropoffLat = input.dropoffLat
            route.dropoffLng = input.dropoffLng
            route.createdAt = Date()

            try await route.save(on: req.db)

            let routeDTO = try TransportRouteDTO(from: route)

            let response = Response(status: .created)
            try response.content.encode(["route": routeDTO], as: .json)
            return response
        }
    }

    // MARK: - PUT /api/transport/routes
    /// Update route
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can update routes
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can update routes")
        }

        struct UpdateRouteRequest: Content {
            let id: String
            let pickupAddress: String?
            let dropoffAddress: String?
            let pickupLat: Double?
            let pickupLng: Double?
            let dropoffLat: Double?
            let dropoffLng: Double?
        }

        let input = try req.content.decode(UpdateRouteRequest.self)

        guard let route = try await TransportRoute.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Route not found")
        }

        // Update fields if provided
        if let pickupAddress = input.pickupAddress {
            route.pickupAddress = pickupAddress
        }
        if let dropoffAddress = input.dropoffAddress {
            route.dropoffAddress = dropoffAddress
        }
        if let pickupLat = input.pickupLat {
            route.pickupLat = pickupLat
        }
        if let pickupLng = input.pickupLng {
            route.pickupLng = pickupLng
        }
        if let dropoffLat = input.dropoffLat {
            route.dropoffLat = dropoffLat
        }
        if let dropoffLng = input.dropoffLng {
            route.dropoffLng = dropoffLng
        }

        try await route.save(on: req.db)

        let routeDTO = try TransportRouteDTO(from: route)

        let response = Response(status: .ok)
        try response.content.encode(["route": routeDTO], as: .json)
        return response
    }

    // MARK: - DELETE /api/transport/routes
    /// Delete route or all routes for an order (Director only)
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Director only
        guard user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can delete routes")
        }

        struct DeleteRouteRequest: Content {
            let id: String?
            let orderID: String?
        }

        let input = try req.content.decode(DeleteRouteRequest.self)

        // Delete all routes for an order
        if let orderID = input.orderID {
            let routesToDelete = try await TransportRoute.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$orderID == orderID)
                .all()

            let deletedCount = routesToDelete.count

            for route in routesToDelete {
                try await route.delete(on: req.db)
            }

            struct DeleteResult: Content {
                let success: Bool
                let deletedCount: Int
            }

            let response = Response(status: .ok)
            try response.content.encode(DeleteResult(success: true, deletedCount: deletedCount), as: .json)
            return response
        }

        // Delete specific route
        if let routeID = input.id {
            guard let route = try await TransportRoute.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$id == routeID)
                .first() else {
                throw Abort(.notFound, reason: "Route not found")
            }

            try await route.delete(on: req.db)

            let response = Response(status: .ok)
            try response.content.encode(["success": true], as: .json)
            return response
        }

        throw Abort(.badRequest, reason: "Either id or orderID is required")
    }
}
