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
    /// Client uses PBKDF2 (100000 iterations, SHA-256) to derive key, then AES-GCM
    private func decryptTelemetry<T: Decodable>(encrypted: String, secret: String) throws -> T {
        // Decode base64
        guard let combined = Data(base64Encoded: encrypted) else {
            throw Abort(.badRequest, reason: "Invalid base64 encrypted data")
        }

        // Extract salt (16 bytes), IV (12 bytes), and encrypted data (includes auth tag)
        guard combined.count > 28 else {
            throw Abort(.badRequest, reason: "Encrypted data too short")
        }

        let salt = combined.prefix(16)
        let iv = combined.dropFirst(16).prefix(12)
        let ciphertext = combined.dropFirst(28)

        // Derive key using PBKDF2 (matching client: 100000 iterations, SHA-256)
        guard let derivedKeyData = try? deriveKeyPBKDF2(
            password: secret,
            salt: salt,
            iterations: 100000,
            keyLength: 32
        ) else {
            throw Abort(.internalServerError, reason: "Key derivation failed")
        }

        let derivedKey = SymmetricKey(data: derivedKeyData)

        // Decrypt using AES-GCM
        // AES.GCM.SealedBox expects combined data (ciphertext + tag)
        let sealedBox = try AES.GCM.SealedBox(
            nonce: AES.GCM.Nonce(data: iv),
            ciphertext: ciphertext.dropLast(16), // Actual ciphertext
            tag: ciphertext.suffix(16) // Last 16 bytes are the auth tag
        )

        let decryptedData = try AES.GCM.open(sealedBox, using: derivedKey)

        // Decode JSON
        let decoder = JSONDecoder()
        return try decoder.decode(T.self, from: decryptedData)
    }

    /// Derive key using PBKDF2 (matching Web Crypto API)
    /// Manual implementation using HMAC-SHA256
    private func deriveKeyPBKDF2(password: String, salt: Data, iterations: Int, keyLength: Int) throws -> Data {
        let passwordData = Data(password.utf8)
        var result = Data()

        // PBKDF2 generates multiple blocks if needed
        let blockCount = (keyLength + 32 - 1) / 32 // SHA256 produces 32 bytes

        for blockIndex in 1...blockCount {
            var block = Data()
            var u = salt + withUnsafeBytes(of: UInt32(blockIndex).bigEndian) { Data($0) }

            // First iteration
            let key = SymmetricKey(data: passwordData)
            u = Data(HMAC<SHA256>.authenticationCode(for: u, using: key))
            block = u

            // Remaining iterations
            for _ in 1..<iterations {
                u = Data(HMAC<SHA256>.authenticationCode(for: u, using: key))
                // XOR with previous result
                for i in 0..<u.count {
                    block[i] ^= u[i]
                }
            }

            result.append(block)
        }

        // Truncate to desired length
        return result.prefix(keyLength)
    }
}
