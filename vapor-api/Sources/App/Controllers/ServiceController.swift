import Vapor
import Fluent

/// CRUD controller for services: GET/POST/PUT/DELETE /api/scheduling/services
struct ServiceController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let services = routes.grouped("scheduling", "services")
        services.get(use: index)
        services.post(use: create)
        services.put(use: update)
        services.delete(use: remove)
    }

    func index(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        let servicesRaw = try await Service.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .all()

        struct ServiceDTO: Content {
            var id: String; var firmaID: String; var name: String
            var description: String?; var duration: Int?; var price: Double?
            var parentId: String?; var isGroup: Bool?; var order: Int?
        }

        let services = servicesRaw.map { s in
            ServiceDTO(
                id: s.id ?? "", firmaID: s.firmaID, name: s.name,
                description: s.description, duration: s.duration,
                price: s.price, parentId: s.parentId,
                isGroup: s.isGroup, order: s.order
            )
        }
        return try await ["services": services].encodeResponse(for: req)
    }

    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var id: String?; var name: String; var description: String?
            var duration: Int?; var price: Double?; var parentId: String?
            var isGroup: Bool?; var order: Int?
        }
        let body = try req.content.decode(Body.self)

        let service = Service()
        service.id = body.id ?? generateId()
        service.firmaID = firmaID
        service.name = body.name
        service.description = body.description
        service.duration = body.duration
        service.price = body.price
        service.parentId = body.parentId
        service.isGroup = body.isGroup
        service.order = body.order
        try await service.save(on: req.db)

        return try await service.encodeResponse(status: .ok, for: req)
    }

    func update(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content {
            var id: String; var name: String?; var description: String?
            var duration: Int?; var price: Double?; var parentId: String?
            var isGroup: Bool?; var order: Int?
        }
        let body = try req.content.decode(Body.self)

        guard let service = try await Service.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Service not found")
        }

        if let name = body.name { service.name = name }
        if let desc = body.description { service.description = desc }
        if let dur = body.duration { service.duration = dur }
        if let price = body.price { service.price = price }
        if let pid = body.parentId { service.parentId = pid }
        if let ig = body.isGroup { service.isGroup = ig }
        if let ord = body.order { service.order = ord }
        try await service.save(on: req.db)

        return try await service.encodeResponse(for: req)
    }

    func remove(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard user.status == nil || user.status == 0 else { throw Abort(.forbidden) }
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Body: Content { var id: String }
        let body = try req.content.decode(Body.self)

        guard let service = try await Service.query(on: req.db)
            .filter(\.$id == body.id)
            .filter(\.$firmaID == firmaID)
            .first() else {
            throw Abort(.notFound, reason: "Service not found")
        }

        try await service.delete(on: req.db)
        return try await ["success": true].encodeResponse(for: req)
    }
}
