import Vapor
import Fluent
import FluentPostgresDriver

/// CRUD controller for transport orders: GET/POST/PUT/DELETE /api/transport/orders
/// Implements role-based access control and order status management
struct OrdersController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let orders = routes.grouped("transport", "orders")
        orders.get(use: index)
        orders.post(use: create)
        orders.put(use: update)
        orders.delete(use: remove)
    }

    // MARK: - GET /api/transport/orders
    /// Returns all orders for firma, or specific order by ID
    /// Query params: ?id=xxx, ?status=xxx, ?driverID=xxx
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let orderID = req.query[String.self, at: "id"]
        let status = req.query[String.self, at: "status"]
        let driverID = req.query[String.self, at: "driverID"]

        // Handle single order fetch by ID
        if let orderID = orderID {
            guard let order = try await Order.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$id == orderID)
                .first() else {
                throw Abort(.notFound, reason: "Order not found")
            }

            // Fetch routes for this order
            let routes = try await TransportRoute.query(on: req.db)
                .filter(\.$orderID == orderID)
                .filter(\.$firmaID == firmaID)
                .sort(\.$sequence, .ascending)
                .all()

            let orderDTO = try OrderDTO(from: order, routes: routes)

            let response = Response(status: .ok)
            try response.content.encode(["order": orderDTO], as: .json)
            return response
        }

        // Fetch all orders for firma
        var query = Order.query(on: req.db)
            .filter(\.$firmaID == firmaID)

        // Apply filters
        if let status = status {
            query = query.filter(\.$status == status)
        }
        if let driverID = driverID {
            query = query.filter(\.$driverID == driverID)
        }

        let orders = try await query
            .sort(\.$createdAt, .descending)
            .all()

        // Batch fetch routes for all orders
        let orderIDs = orders.compactMap { $0.id }
        let allRoutes = try await TransportRoute.query(on: req.db)
            .filter(\.$orderID ~~ orderIDs)
            .filter(\.$firmaID == firmaID)
            .sort(\.$sequence, .ascending)
            .all()

        // Group routes by orderID
        var routesByOrder: [String: [TransportRoute]] = [:]
        for route in allRoutes {
            routesByOrder[route.orderID, default: []].append(route)
        }

        // Build DTOs with routes
        let orderDTOs = try orders.map { order in
            let orderRoutes = order.id.flatMap { routesByOrder[$0] }
            return try OrderDTO(from: order, routes: orderRoutes)
        }

        let response = Response(status: .ok)
        try response.content.encode(["orders": orderDTOs], as: .json)
        return response
    }

    // MARK: - POST /api/transport/orders
    /// Create new order (Dispatcher/Director only)
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can create orders
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can create orders")
        }

        struct CreateOrderRequest: Content {
            let clientID: String
            let appointmentID: String?
            let scheduledTime: String?
            let clientComment: String?
            let phone: String?
        }

        let input = try req.content.decode(CreateOrderRequest.self)

        // Validate clientID exists
        let clientExists = try await Client.query(on: req.db)
            .filter(\.$id == input.clientID)
            .filter(\.$firmaID == firmaID)
            .first() != nil

        guard clientExists else {
            throw Abort(.badRequest, reason: "Client not found")
        }

        // Generate order ID (nanoid)
        let orderID = [UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21)

        let order = Order()
        order.id = String(orderID)
        order.firmaID = firmaID
        order.clientID = input.clientID
        order.dispatcherID = user.userId
        order.appointmentID = input.appointmentID
        order.scheduledTime = input.scheduledTime.flatMap { parseISODate($0) }
        order.status = "CREATED"
        order.clientComment = input.clientComment
        order.phone = input.phone
        order.createdAt = Date()

        try await order.save(on: req.db)

        let orderDTO = try OrderDTO(from: order, routes: [])

        let response = Response(status: .created)
        try response.content.encode(["order": orderDTO], as: .json)
        return response
    }

    // MARK: - PUT /api/transport/orders
    /// Update order or change status via action
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct UpdateOrderRequest: Content {
            let id: String
            let action: String?
            let driverID: String?
            let vehicleID: String?
            let reasonID: String?
            let customReason: String?
            let clientComment: String?
            let scheduledTime: String?
        }

        let input = try req.content.decode(UpdateOrderRequest.self)

        guard let order = try await Order.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Order not found")
        }

        // Handle status change actions
        if let action = input.action {
            switch action {
            case "assign":
                // Dispatcher only
                guard user.status == 0 || user.status == 1 else {
                    throw Abort(.forbidden, reason: "Only dispatchers can assign orders")
                }
                guard let driverID = input.driverID, let vehicleID = input.vehicleID else {
                    throw Abort(.badRequest, reason: "driverID and vehicleID are required for assignment")
                }
                order.driverID = driverID
                order.vehicleID = vehicleID
                order.dispatcherID = user.userId
                order.status = "ASSIGNED"
                order.assignedAt = Date()

            case "accept":
                // Driver only
                order.status = "ACCEPTED"
                order.acceptedAt = Date()

            case "reject":
                // Driver only - record rejection
                guard let _ = input.reasonID else {
                    throw Abort(.badRequest, reason: "reasonID is required for rejection")
                }
                // TODO: Insert into order_rejects table (reasonID and customReason)
                order.status = "CREATED"
                order.driverID = nil
                order.vehicleID = nil

            case "arrive":
                order.status = "ARRIVED"
                order.arrivedAt = Date()

            case "start":
                order.status = "IN_PROGRESS"
                order.startedAt = Date()

            case "complete":
                order.status = "COMPLETED"
                order.completedAt = Date()

            case "cancel":
                order.status = "CANCELLED"
                order.cancelledAt = Date()

            default:
                throw Abort(.badRequest, reason: "Invalid action")
            }
        } else {
            // General update (Dispatcher/Director only)
            guard user.status == 0 || user.status == 1 else {
                throw Abort(.forbidden, reason: "Only dispatchers can update orders")
            }

            if let comment = input.clientComment {
                order.clientComment = comment
            }
            if let scheduledTime = input.scheduledTime {
                order.scheduledTime = parseISODate(scheduledTime)
            }
        }

        try await order.save(on: req.db)

        // Fetch routes
        let routes = try await TransportRoute.query(on: req.db)
            .filter(\.$orderID == input.id)
            .filter(\.$firmaID == firmaID)
            .sort(\.$sequence, .ascending)
            .all()

        let orderDTO = try OrderDTO(from: order, routes: routes)

        let response = Response(status: .ok)
        try response.content.encode(["order": orderDTO], as: .json)
        return response
    }

    // MARK: - DELETE /api/transport/orders
    /// Delete order (Director only)
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Director only
        guard user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can delete orders")
        }

        struct DeleteOrderRequest: Content {
            let id: String
        }

        let input = try req.content.decode(DeleteOrderRequest.self)

        guard let order = try await Order.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Order not found")
        }

        try await order.delete(on: req.db)

        let response = Response(status: .ok)
        try response.content.encode(["success": true], as: .json)
        return response
    }

    // MARK: - Helper Functions

    private func parseISODate(_ s: String) -> Date? {
        // Full ISO8601 with fractional seconds
        let withMs = ISO8601DateFormatter()
        withMs.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let d = withMs.date(from: s) { return d }

        // Standard ISO8601
        let plain = ISO8601DateFormatter()
        plain.formatOptions = [.withInternetDateTime]
        if let d = plain.date(from: s) { return d }

        // Simple date string (YYYY-MM-DD)
        let simple = DateFormatter()
        simple.dateFormat = "yyyy-MM-dd"
        simple.timeZone = TimeZone(secondsFromGMT: 0)
        return simple.date(from: s)
    }
}
