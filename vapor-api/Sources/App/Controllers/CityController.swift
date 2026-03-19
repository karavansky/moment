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

    /// GET /cities?firmaID=RkGvXq9mizBv0c63zO1Hg
    /// Returns all cities for the specified firma
    func index(req: Request) async throws -> [CityDTO] {
        guard let firmaID = req.query[String.self, at: "firmaID"] else {
            throw Abort(.badRequest, reason: "Missing firmaID parameter")
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
    /// Creates a new city
    func create(req: Request) async throws -> Response {
        let dto = try req.content.decode(CreateCityDTO.self)

        let city = City(
            city: dto.city,
            firmaID: dto.firmaID
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
    /// Deletes a city
    func delete(req: Request) async throws -> HTTPStatus {
        guard let id = req.parameters.get("id", as: Int.self) else {
            throw Abort(.badRequest, reason: "Invalid city ID")
        }

        guard let city = try await City.find(id, on: req.db) else {
            throw Abort(.notFound, reason: "City not found")
        }

        try await city.delete(on: req.db)

        return .noContent
    }
}
