import Vapor
import Fluent

struct CityController: RouteCollection {
    func boot(routes: RoutesBuilder) throws {
        let cities = routes.grouped("cities")

        // GET /cities?firmaID=123
        cities.get(use: index)

        // GET /cities/:id
        cities.get(":id", use: show)

        // POST /cities
        cities.post(use: create)

        // PUT /cities/:id
        cities.put(":id", use: update)

        // DELETE /cities/:id
        cities.delete(":id", use: delete)
    }

    /// GET /cities
    /// Returns all cities for the authenticated user's firma
    func index(req: Request) async throws -> [CityDTO] {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "User has no firmaID")
        }

        let cities = try await City.query(on: req.db)
            .filter(\.$firmaID == firmaID)
            .sort(\.$city, .ascending)
            .all()

        return try cities.map { try CityDTO(from: $0) }
    }

    /// GET /cities/:id
    /// Returns a single city by ID
    func show(req: Request) async throws -> CityDTO {
        guard let id = req.parameters.get("id", as: Int.self) else {
            throw Abort(.badRequest, reason: "Invalid city ID")
        }

        guard let city = try await City.find(id, on: req.db) else {
            throw Abort(.notFound, reason: "City not found")
        }

        return try CityDTO(from: city)
    }

    /// POST /cities
    /// Creates a new city for the authenticated user's firma
    func create(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "User has no firmaID")
        }

        // Only Director (status 0 or null) can create cities
        guard user.status == nil || user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can manage cities")
        }

        struct CreateBody: Content {
            var city: String
        }
        let body = try req.content.decode(CreateBody.self)

        let city = City(
            city: body.city.trimmingCharacters(in: .whitespacesAndNewlines),
            firmaID: firmaID
        )

        try await city.save(on: req.db)

        let responseDTO = try CityDTO(from: city)
        return try await responseDTO.encodeResponse(status: .created, for: req)
    }

    /// PUT /cities/:id
    /// Updates an existing city
    func update(req: Request) async throws -> CityDTO {
        guard let id = req.parameters.get("id", as: Int.self) else {
            throw Abort(.badRequest, reason: "Invalid city ID")
        }

        guard let city = try await City.find(id, on: req.db) else {
            throw Abort(.notFound, reason: "City not found")
        }

        let dto = try req.content.decode(UpdateCityDTO.self)

        if let newCityName = dto.city {
            city.city = newCityName
        }

        try await city.save(on: req.db)

        return try CityDTO(from: city)
    }

    /// DELETE /cities/:id
    /// Deletes a city (Director only, must own the city)
    func delete(req: Request) async throws -> HTTPStatus {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else {
            throw Abort(.forbidden, reason: "User has no firmaID")
        }

        // Only Director (status 0 or null) can delete cities
        guard user.status == nil || user.status == 0 else {
            throw Abort(.forbidden, reason: "Only directors can manage cities")
        }

        guard let id = req.parameters.get("id", as: Int.self) else {
            throw Abort(.badRequest, reason: "Invalid city ID")
        }

        guard let city = try await City.find(id, on: req.db) else {
            throw Abort(.notFound, reason: "City not found")
        }

        // Verify the city belongs to the user's firma
        guard city.firmaID == firmaID else {
            throw Abort(.forbidden, reason: "Cannot delete city from another organization")
        }

        try await city.delete(on: req.db)

        return .noContent
    }
}
