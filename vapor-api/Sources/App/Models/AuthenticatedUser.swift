import Vapor

/// Represents an authenticated user extracted from a verified JWT token.
/// Stored in `req.auth` after successful authentication.
struct AuthenticatedUser: Authenticatable, Sendable {
    let userId: String
    let email: String
    let isAdmin: Bool
    let firmaID: String?
    let sessionId: String?
    let status: Int?
}
