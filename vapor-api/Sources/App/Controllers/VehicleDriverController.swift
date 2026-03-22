import Vapor
import Fluent
import FluentPostgresDriver

/// Controller for vehicle-driver assignment history
/// GET /api/transport/vehicles/:vehicleID/history - get driver history for a vehicle
/// POST /api/transport/vehicles/:vehicleID/assign-driver - assign/change driver
/// POST /api/transport/vehicles/:vehicleID/unassign-driver - unassign driver
struct VehicleDriverController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let vehicles = routes.grouped("transport", "vehicles")
        vehicles.get(":vehicleID", "history", use: getHistory)
        vehicles.post(":vehicleID", "assign-driver", use: assignDriver)
        vehicles.post(":vehicleID", "unassign-driver", use: unassignDriver)
    }

    // MARK: - GET /api/transport/vehicles/:vehicleID/history
    /// Get driver assignment history for a vehicle
    func getHistory(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let vehicleID = req.parameters.get("vehicleID") else {
            throw Abort(.badRequest, reason: "Vehicle ID is required")
        }

        // Verify vehicle belongs to firma
        guard let _ = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == vehicleID)
            .first() else {
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        let db = req.db as! any SQLDatabase

        // Get history with driver names
        let rows = try await db.raw("""
            SELECT
                vd."historyID",
                vd."vehicleID",
                vd."driverID",
                w.name as "driverName",
                w.surname as "driverSurname",
                vd."assignedAt",
                vd."unassignedAt",
                vd."assignedBy",
                vd."notes",
                (vd."unassignedAt" IS NULL) as "isActive"
            FROM vehicle_drivers vd
            JOIN workers w ON vd."driverID" = w."workerID"
            WHERE vd."vehicleID" = \(bind: vehicleID)
            ORDER BY vd."assignedAt" DESC
            """).all()

        struct HistoryDTO: Content {
            let historyID: String
            let vehicleID: String
            let driverID: String
            let driverName: String
            let driverSurname: String?
            let assignedAt: Date
            let unassignedAt: Date?
            let assignedBy: String?
            let notes: String?
            let isActive: Bool
        }

        var history: [HistoryDTO] = []
        for row in rows {
            history.append(HistoryDTO(
                historyID: try row.decode(column: "historyID", as: String.self),
                vehicleID: try row.decode(column: "vehicleID", as: String.self),
                driverID: try row.decode(column: "driverID", as: String.self),
                driverName: try row.decode(column: "driverName", as: String.self),
                driverSurname: try? row.decode(column: "driverSurname", as: String?.self),
                assignedAt: try row.decode(column: "assignedAt", as: Date.self),
                unassignedAt: try? row.decode(column: "unassignedAt", as: Date?.self),
                assignedBy: try? row.decode(column: "assignedBy", as: String?.self),
                notes: try? row.decode(column: "notes", as: String?.self),
                isActive: (try? row.decode(column: "isActive", as: Bool.self)) ?? false
            ))
        }

        let response = Response(status: .ok)
        try response.content.encode(["history": history], as: .json)
        return response
    }

    // MARK: - POST /api/transport/vehicles/:vehicleID/assign-driver
    /// Assign or change driver for a vehicle
    func assignDriver(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can assign drivers")
        }

        guard let vehicleID = req.parameters.get("vehicleID") else {
            throw Abort(.badRequest, reason: "Vehicle ID is required")
        }

        struct AssignRequest: Content {
            let driverID: String
            let notes: String?
        }

        let input = try req.content.decode(AssignRequest.self)

        // Verify vehicle belongs to firma
        guard let vehicle = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == vehicleID)
            .first() else {
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        // Verify driver belongs to firma
        guard let driver = try await Worker.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.driverID)
            .first() else {
            throw Abort(.notFound, reason: "Driver not found")
        }

        // Check if driver is already assigned to another vehicle
        if let existingVehicle = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$currentDriverID == input.driverID)
            .filter(\.$id != vehicleID)
            .first() {
            throw Abort(.conflict, reason: "Driver is already assigned to vehicle \(existingVehicle.plateNumber)")
        }

        let db = req.db as! any SQLDatabase

        // Use transaction for consistency
        try await req.db.transaction { database in
            let _ = database as! any SQLDatabase

            // Check if there's an active assignment
            let existingAssignments = try await VehicleDriver.query(on: database)
                .filter(\.$vehicleID == vehicleID)
                .filter(\.$unassignedAt == nil)
                .all()

            if !existingAssignments.isEmpty {
                // Close existing assignments
                for assignment in existingAssignments {
                    assignment.unassignedAt = Date()
                    if let notes = input.notes {
                        assignment.notes = (assignment.notes ?? "") + "\nChanged: " + notes
                    }
                    try await assignment.save(on: database)

                    // Remove vehicle from old driver
                    if let oldDriver = try await Worker.query(on: database)
                        .filter(\.$id == assignment.driverID)
                        .first() {
                        oldDriver.vehicleID = nil
                        oldDriver.hasVehicle = false
                        try await oldDriver.save(on: database)
                    }
                }
            }

            // Create new assignment
            let historyID = [UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21)
            let newAssignment = VehicleDriver(
                id: String(historyID),
                vehicleID: vehicleID,
                driverID: input.driverID,
                assignedAt: Date(),
                assignedBy: user.userId,
                notes: input.notes
            )
            try await newAssignment.save(on: database)

            // Update vehicle
            vehicle.currentDriverID = input.driverID
            try await vehicle.save(on: database)

            // Update driver
            driver.vehicleID = vehicleID
            driver.hasVehicle = true
            try await driver.save(on: database)
        }

        // Return updated vehicle with driver info
        let updatedVehicle = try await Vehicle.query(on: req.db)
            .filter(\.$id == vehicleID)
            .first()!

        let driverInfo = try await db.raw("""
            SELECT name, surname
            FROM workers
            WHERE "workerID" = \(bind: input.driverID)
            """).first()

        let driverName = try? driverInfo?.decode(column: "name", as: String?.self)
        let driverSurname = try? driverInfo?.decode(column: "surname", as: String?.self)

        let vehicleDTO = try VehicleDTO(from: updatedVehicle, driverName: driverName, driverSurname: driverSurname)

        struct AssignResponse: Content {
            let vehicle: VehicleDTO
            let message: String
        }

        let response = Response(status: .ok)
        try response.content.encode(AssignResponse(vehicle: vehicleDTO, message: "Driver assigned successfully"), as: .json)
        return response
    }

    // MARK: - POST /api/transport/vehicles/:vehicleID/unassign-driver
    /// Unassign driver from vehicle
    func unassignDriver(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can unassign drivers")
        }

        guard let vehicleID = req.parameters.get("vehicleID") else {
            throw Abort(.badRequest, reason: "Vehicle ID is required")
        }

        struct UnassignRequest: Content {
            let notes: String?
        }

        let input = try req.content.decode(UnassignRequest.self)

        // Verify vehicle belongs to firma
        guard let vehicle = try await Vehicle.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == vehicleID)
            .first() else {
            throw Abort(.notFound, reason: "Vehicle not found")
        }

        guard vehicle.currentDriverID != nil else {
            throw Abort(.badRequest, reason: "Vehicle has no assigned driver")
        }

        // Use transaction
        try await req.db.transaction { database in
            // Close active assignment
            let activeAssignments = try await VehicleDriver.query(on: database)
                .filter(\.$vehicleID == vehicleID)
                .filter(\.$unassignedAt == nil)
                .all()

            for assignment in activeAssignments {
                assignment.unassignedAt = Date()
                if let notes = input.notes {
                    assignment.notes = (assignment.notes ?? "") + "\nUnassigned: " + notes
                }
                try await assignment.save(on: database)

                // Remove vehicle from driver
                if let driver = try await Worker.query(on: database)
                    .filter(\.$id == assignment.driverID)
                    .first() {
                    driver.vehicleID = nil
                    driver.hasVehicle = false
                    try await driver.save(on: database)
                }
            }

            // Update vehicle
            vehicle.currentDriverID = nil
            try await vehicle.save(on: database)
        }

        // Return updated vehicle
        let updatedVehicle = try await Vehicle.query(on: req.db)
            .filter(\.$id == vehicleID)
            .first()!

        let vehicleDTO = try VehicleDTO(from: updatedVehicle)

        struct UnassignResponse: Content {
            let vehicle: VehicleDTO
            let message: String
        }

        let response = Response(status: .ok)
        try response.content.encode(UnassignResponse(vehicle: vehicleDTO, message: "Driver unassigned successfully"), as: .json)
        return response
    }
}
