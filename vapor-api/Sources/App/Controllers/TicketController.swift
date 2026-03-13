import Vapor
import Fluent

/// Controller for tickets: GET /api/tickets/my, GET/POST /api/tickets/:ticketID/messages
struct TicketController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let tickets = routes.grouped("tickets")
        
        tickets.get("my", use: getMyTickets)
        
        let ticketIdGroup = tickets.grouped(":ticketID", "messages")
        ticketIdGroup.get(use: getMessages)
        ticketIdGroup.post(use: postMessage)
    }

    // GET /api/tickets/my
    func getMyTickets(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        // Fetch tickets for this user and firma
        let tickets = try await Ticket.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .filter(\.$userID == user.userId)
            .sort(\.$date, .descending)
            .all()

        return try await tickets.encodeResponse(for: req)
    }

    // GET /api/tickets/:ticketID/messages
    func getMessages(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let ticketID = req.parameters.get("ticketID") else { throw Abort(.badRequest) }

        // Verify ticket belongs to user and firma
        guard let _ = try await Ticket.query(on: req.db)
            .filter(\.$id == ticketID)
            .filter(\.$firmaID == firmaID)
            .filter(\.$userID == user.userId)
            .first() else {
            throw Abort(.notFound)
        }

        let messages = try await Message.query(on: req.db)
            .filter(\.$ticket.$id == ticketID)
            .sort(\.$createdAt, .ascending)
            .all()

        return try await messages.encodeResponse(for: req)
    }

    // POST /api/tickets/:ticketID/messages
    func postMessage(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }
        guard let ticketID = req.parameters.get("ticketID") else { throw Abort(.badRequest) }

        struct Body: Content { var message: String }
        let body = try req.content.decode(Body.self)

        // Verify ticket belongs to user and firma
        guard let _ = try await Ticket.query(on: req.db)
            .filter(\.$id == ticketID)
            .filter(\.$firmaID == firmaID)
            .filter(\.$userID == user.userId)
            .first() else {
            throw Abort(.notFound)
        }

        // Add message
        let msg = Message()
        msg.id = generateId()
        msg.$ticket.id = ticketID
        msg.senderID = user.userId
        msg.text = body.message
        try await msg.save(on: req.db)

        return try await msg.encodeResponse(status: .ok, for: req)
    }
}
