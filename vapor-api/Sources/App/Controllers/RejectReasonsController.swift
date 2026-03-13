import Vapor
import Fluent

/// CRUD controller for reject reasons: GET/POST/PUT/DELETE /api/transport/reject-reasons
/// Manages dictionary of reasons why drivers reject orders
struct RejectReasonsController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let reasons = routes.grouped("transport", "reject-reasons")
        reasons.get(use: index)
        reasons.post(use: create)
        reasons.put(use: update)
        reasons.delete(use: remove)
    }

    // MARK: - GET /api/transport/reject-reasons
    /// Returns all active reject reasons for firma
    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let reasons = try await RejectReason.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$isActive == true)
            .sort(\.$reasonText, .ascending)
            .all()

        let reasonDTOs = try reasons.map { try RejectReasonDTO(from: $0) }

        let response = Response(status: .ok)
        try response.content.encode(["reasons": reasonDTOs], as: .json)
        return response
    }

    // MARK: - POST /api/transport/reject-reasons
    /// Create new reject reason (Director/Dispatcher only)
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can create reasons
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can create reject reasons")
        }

        struct CreateReasonRequest: Content {
            let reasonText: String
        }

        let input = try req.content.decode(CreateReasonRequest.self)

        // Validate reasonText is not empty
        guard !input.reasonText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            throw Abort(.badRequest, reason: "reasonText cannot be empty")
        }

        // Generate reason ID (nanoid)
        let reasonID = [UInt8].random(count: 21).map { String(format: "%02x", $0) }.joined().prefix(21)

        let reason = RejectReason()
        reason.id = String(reasonID)
        reason.firmaID = firmaID
        reason.reasonText = input.reasonText
        reason.isActive = true
        reason.createdAt = Date()

        try await reason.save(on: req.db)

        let reasonDTO = try RejectReasonDTO(from: reason)

        let response = Response(status: .created)
        try response.content.encode(["reason": reasonDTO], as: .json)
        return response
    }

    // MARK: - PUT /api/transport/reject-reasons
    /// Update reject reason (Director/Dispatcher only)
    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Only dispatchers and directors can update reasons
        guard user.status == 0 || user.status == 1 else {
            throw Abort(.forbidden, reason: "Only dispatchers can update reject reasons")
        }

        struct UpdateReasonRequest: Content {
            let id: String
            let reasonText: String?
            let isActive: Bool?
        }

        let input = try req.content.decode(UpdateReasonRequest.self)

        guard let reason = try await RejectReason.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Reject reason not found")
        }

        // Update fields if provided
        if let reasonText = input.reasonText {
            guard !reasonText.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
                throw Abort(.badRequest, reason: "reasonText cannot be empty")
            }
            reason.reasonText = reasonText
        }

        if let isActive = input.isActive {
            reason.isActive = isActive
        }

        try await reason.save(on: req.db)

        let reasonDTO = try RejectReasonDTO(from: reason)

        let response = Response(status: .ok)
        try response.content.encode(["reason": reasonDTO], as: .json)
        return response
    }

    // MARK: - DELETE /api/transport/reject-reasons
    /// Delete reject reason (Director only)
    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Director only
        guard user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can delete reject reasons")
        }

        struct DeleteReasonRequest: Content {
            let id: String
        }

        let input = try req.content.decode(DeleteReasonRequest.self)

        guard let reason = try await RejectReason.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$id == input.id)
            .first() else {
            throw Abort(.notFound, reason: "Reject reason not found")
        }

        try await reason.delete(on: req.db)

        let response = Response(status: .ok)
        try response.content.encode(["success": true], as: .json)
        return response
    }
}
