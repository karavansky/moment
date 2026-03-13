import Vapor
import Fluent

/// CRUD controller for vehicles: GET/POST/PUT/DELETE /api/transport/vehicles
/// Manages the company's vehicle fleet
struct VehiclesController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let vehicles = routes.grouped("transport", "vehicles")
        vehicles.get(use: index)
        vehicles.post(use: create)
        vehicles.put(use: update)
        vehicles.delete(use: remove)
    }

    // MARK: - GET /api/transport/vehicles
    /// Returns all vehicles for firma, or specific vehicle by ID
    /// Query params: ?id=xxx, ?type=xxx, ?status=xxx
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let vehicleID = req.query[String.self, at: "id"]
        let type = req.query[String.self, at: "type"]
        let status = req.query[String.self, at: "status"]

        // Handle single vehicle fetch by ID
        if let vehicleID = vehicleID {
            guard let vehicle = try await Vehicle.query(on: req.db)
                .filter(\.$firmaID == firmaID)
                .filter(\.$id == vehicleID)
                .first() else {
                throw Abort(.notFound, reason: "Vehicle not found")
            }

            let vehicleDTO = try VehicleDTO(from: vehicle)

            let response = Response(status: .ok)
            try response.content.encode(["vehicle": vehicleDTO], as: .json)
            return response
        }

        // Fetch all vehicles for firma
        var query = Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)

        // Apply filters
        if let type = type {
            query = query.filter(\.$type == type)
        }
        if let status = status {
            query = query.filter(\.$status == status)
        }

        let vehicles = try await query
            .sort(\.$plateNumber, .ascending)
            .all()

        let vehicleDTOs = try vehicles.map { try VehicleDTO(from: $0) }

        let response = Response(status: .ok)
        try response.content.encode(["vehicles": vehicleDTOs], as: .json)
        return response
    }

    // MARK: - POST /api/transport/vehicles
    /// Create new vehicle (Director/Dispatcher only)
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can create vehicles
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can create vehicles")
        }

        struct CreateVehicleRequest: Content {
            let plateNumber: String
            let type: String // STANDARD, MINIVAN, WHEELCHAIR
            let status: String? // ACTIVE, REPAIR, INACTIVE
        }

        let input = try req.content.decode(CreateVehicleRequest.self)

        // Validate type
        let validTypes = ["STANDARD", "MINIVAN", "WHEELCHAIR"]
        guard validTypes.contains(input.type) else {
            throw Abort(.badRequest, reason: "Invalid vehicle type. Must be: \(validTypes.joined(separator: ", "))")
        }

        // Validate status
        let status = input.status ?? "ACTIVE"
        let validStatuses = ["ACTIVE", "REPAIR", "INACTIVE"]
        guard validStatuses.contains(status) else {
            throw Abort(.badRequest, reason: "Invalid status. Must be: \(validStatuses.joined(separator: ", "))")
        }

        // Check if plate number already exists
        let existingVehicle = try await Vehicle.query(on: req.db)
            .filter(\.$plateNumber == input.plateNumber)
            .first()

        guard existingVehicle == nil else {
            throw Abort(.conflict, reason: "Vehicle with this plate number already exists")
        }

        // Generate vehicle ID (nanoid)
        let vehicleID = [UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21)

        let vehicle = Vehicle()
        vehicle.id = String(vehicleID)
        vehicle.firmaID = firmaID
        vehicle.plateNumber = input.plateNumber
        vehicle.type = input.type
        vehicle.status = status
        vehicle.createdAt = Date()

        try await vehicle.save(on: req.db)

        let vehicleDTO = try VehicleDTO(from: vehicle)

        let response = Response(status: .created)
        try response.content.encode(["vehicle": vehicleDTO], as: .json)
        return response
    }

    // MARK: - PUT /api/transport/vehicles
    /// Update vehicle (Director/Dispatcher only)
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can update vehicles
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can update vehicles")
        }

        struct UpdateVehicleRequest: Content {
            let id: String
            let plateNumber: String?
            let type: String?
            let status: String?
            let currentDriverID: String?
            let currentLat: Double?
            let currentLng: Double?
        }

        let input = try req.content.decode(UpdateVehicleRequest.self)

        guard let vehicle = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        // Update fields if provided
        if let plateNumber = input.plateNumber {
            // Check for duplicate plate number
            let duplicate = try await Vehicle.query(on: req.db)
                .filter(\.$plateNumber == plateNumber)
                .filter(\.$id != input.id)
                .first()

            guard duplicate == nil else {
                throw Abort(.conflict, reason: "Vehicle with this plate number already exists")
            }
            vehicle.plateNumber = plateNumber
        }

        if let type = input.type {
            let validTypes = ["STANDARD", "MINIVAN", "WHEELCHAIR"]
            guard validTypes.contains(type) else {
                throw Abort(.badRequest, reason: "Invalid vehicle type")
            }
            vehicle.type = type
        }

        if let status = input.status {
            let validStatuses = ["ACTIVE", "REPAIR", "INACTIVE"]
            guard validStatuses.contains(status) else {
                throw Abort(.badRequest, reason: "Invalid status")
            }
            vehicle.status = status
        }

        if let currentDriverID = input.currentDriverID {
            vehicle.currentDriverID = currentDriverID
        }

        if let currentLat = input.currentLat {
            vehicle.currentLat = currentLat
            vehicle.lastLocationUpdate = Date()
        }

        if let currentLng = input.currentLng {
            vehicle.currentLng = currentLng
            vehicle.lastLocationUpdate = Date()
        }

        try await vehicle.save(on: req.db)

        let vehicleDTO = try VehicleDTO(from: vehicle)

        let response = Response(status: .ok)
        try response.content.encode(["vehicle": vehicleDTO], as: .json)
        return response
    }

    // MARK: - DELETE /api/transport/vehicles
    /// Delete vehicle (Director only)
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Director only
        guard user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can delete vehicles")
        }

        struct DeleteVehicleRequest: Content {
            let id: String
        }

        let input = try req.content.decode(DeleteVehicleRequest.self)

        guard let vehicle = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        try await vehicle.delete(on: req.db)

        let response = Response(status: .ok)
        try response.content.encode(["success": true], as: .json)
        return response
    }
}
