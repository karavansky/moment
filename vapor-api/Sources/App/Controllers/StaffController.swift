import Vapor
import Fluent
import FluentPostgresDriver
import Crypto

/// Controller for staff status: GET /api/staff/sync-device, GET /api/staff/verify-push
struct StaffController: RouteCollection {
    func boot(routes: any RoutesBuilder) throws {
        let staff = routes.grouped("staff")
        staff.post("sync-device", use: syncDevice)
    }

    // POST /api/staff/sync-device
    func syncDevice(req: Request) async throws -> Response {
        let user = try req.auth.require(AuthenticatedUser.self)
        guard let firmaID = user.firmaID else { throw Abort(.forbidden) }

        struct Query: Content {
            var batteryLevel: Double?
            var batteryStatus: String?
            var appVersion: String?
            var osVersion: String?
            var pwaVersion: String?
            var geolocationEnabled: Bool?
            var pushNotificationsEnabled: Bool?
        }

        struct EncryptedPayload: Content {
            var encrypted: String
        }

        // Try to decode encrypted payload first, fallback to plain
        let query: Query
        if let encryptedPayload = try? req.content.decode(EncryptedPayload.self) {
            // Decrypt telemetry data
            guard let secret = Environment.get("TELEMETRY_SECRET") else {
                req.logger.error("TELEMETRY_SECRET not configured")
                throw Abort(.internalServerError, reason: "Server configuration error")
            }
            query = try decryptTelemetry(encrypted: encryptedPayload.encrypted, secret: secret)
        } else {
            // Fallback to unencrypted (backward compatibility)
            query = try req.content.decode(Query.self)
        }
        
        let db = req.db as! any SQLDatabase
        
        // Update user telemetry
        if let v = query.batteryLevel {
            try await db.raw("UPDATE users SET \"batteryLevel\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run()
        }
        if let v = query.batteryStatus {
            try await db.raw("UPDATE users SET \"batteryStatus\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run()
        }
        if let v = query.pwaVersion ?? query.appVersion {
            try await db.raw("UPDATE users SET \"pwaVersion\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run()
        }
        if let v = query.osVersion {
            try await db.raw("UPDATE users SET \"osVersion\" = \(bind: v) WHERE \"userID\" = \(bind: user.userId)").run()
        }

        // Notify if worker
        if let _ = try await Worker.query(on: req.db).filter(\.$userID == user.userId).first() {
            pgNotify(req: req, firmaID: firmaID, type: "worker_updated")
        }

        return try await ["success": true].encodeResponse(for: req)
    }

    /// Decrypt AES-GCM telemetry data from client
    private func decryptTelemetry<T: Decodable>(encrypted: String, secret: String) throws -> T {
        // Decode base64
        guard let combined = Data(base64Encoded: encrypted) else {
            throw Abort(.badRequest, reason: "Invalid base64 encrypted data")
        }

        // Extract salt (16 bytes), IV (12 bytes), and encrypted data
        guard combined.count > 28 else {
            throw Abort(.badRequest, reason: "Encrypted data too short")
        }

        let salt = combined.prefix(16)
        let iv = combined.dropFirst(16).prefix(12)
        let ciphertext = combined.dropFirst(28)

        // Derive key using HKDF (same as client)
        let inputKeyMaterial = SymmetricKey(data: Data(secret.utf8))
        let derivedKey = HKDF<SHA256>.deriveKey(
            inputKeyMaterial: inputKeyMaterial,
            salt: salt,
            info: Data(),
            outputByteCount: 32
        )

        // Decrypt using AES-GCM
        let sealedBox = try AES.GCM.SealedBox(
            nonce: AES.GCM.Nonce(data: iv),
            ciphertext: ciphertext.dropLast(16), // Remove auth tag
            tag: ciphertext.suffix(16) // Last 16 bytes are the tag
        )

        let decryptedData = try AES.GCM.open(sealedBox, using: derivedKey)

        // Decode JSON
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: decryptedData)
    }
}
