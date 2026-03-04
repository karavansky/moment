import Vapor
import Fluent
import Foundation
import Crypto      // swift-crypto: HKDF, HMAC
import CryptoSwift // AES-CBC for JWE A256CBC-HS512

/// NextAuth v5 JWE token payload (after decryption).
struct NextAuthPayload: Codable, Sendable {
    var sub: String?
    var userId: String?
    var email: String?
    var isAdmin: Bool?
    var firmaID: String?
    var sessionId: String?
    var provider: String?
    var status: Int?
    var iat: Int?
    var exp: Int?
    var jti: String?
}

/// Middleware that decrypts NextAuth v5 JWE tokens.
///
/// NextAuth v5 encrypts session tokens using JWE with:
/// - Key Management: `dir` (direct key agreement — no key wrapping)
/// - Content Encryption: `A256CBC-HS512` (AES-256-CBC + HMAC-SHA-512)
/// - Key Derivation: HKDF(SHA-256, AUTH_SECRET, salt, info, 64 bytes)
///   where salt = cookie name, info = "Auth.js Generated Encryption Key (<salt>)"
///
/// JWE Compact Serialization format (5 parts, dot-separated):
///   header.encryptedKey.iv.ciphertext.tag
/// For `dir` algorithm, encryptedKey is always empty.
///
/// Source: `@auth/core/jwt.js` — lines 38-123
struct JWTAuthMiddleware: AsyncMiddleware, Sendable {

    func respond(to request: Request, chainingTo next: any AsyncResponder) async throws -> Response {
        // 1. Extract JWE token
        guard let token = extractToken(from: request) else {
            throw Abort(.unauthorized, reason: "Missing authentication token")
        }

        // 2. Get AUTH_SECRET
        guard let authSecret = Environment.get("AUTH_SECRET") else {
            throw Abort(.internalServerError, reason: "AUTH_SECRET not configured")
        }

        // 3. Determine salt (cookie name used for HKDF)
        let salt = determineSalt(from: request)

        // 4. Derive encryption key via HKDF
        let derivedKey = try deriveEncryptionKey(secret: authSecret, salt: salt)

        // 5. Decrypt JWE
        let payload: NextAuthPayload
        do {
            payload = try decryptJWE(token: token, key: derivedKey)
        } catch {
            request.logger.warning("JWE decryption failed: \(error)")
            throw Abort(.unauthorized, reason: "Invalid authentication token")
        }

        // 6. Check expiration
        if let exp = payload.exp, exp < Int(Date().timeIntervalSince1970) {
            throw Abort(.unauthorized, reason: "Token expired")
        }

        // 7. Extract user info
        guard let userId = payload.userId else {
            throw Abort(.unauthorized, reason: "Token missing userId")
        }

        // 8. Validate session in DB
        if let sessionId = payload.sessionId {
            let session = try await DBSession.find(sessionId, on: request.db)
            guard let session = session else {
                request.logger.info("Session not found in DB: \(sessionId)")
                throw Abort(.unauthorized, reason: "Session expired or invalidated")
            }
            if session.expiresAt < Date() {
                request.logger.info("Session expired: \(sessionId)")
                throw Abort(.unauthorized, reason: "Session expired")
            }
        }

        // 9. Store authenticated user
        let authUser = AuthenticatedUser(
            userId: userId,
            email: payload.email ?? "",
            isAdmin: payload.isAdmin ?? false,
            firmaID: payload.firmaID,
            sessionId: payload.sessionId,
            status: payload.status
        )
        request.auth.login(authUser)

        return try await next.respond(to: request)
    }

    // MARK: - Token Extraction

    /// Extracts JWE token, handling NextAuth's chunked cookie format.
    /// NextAuth splits long JWE tokens into: `name.0`, `name.1`, `name.2`, etc.
    private func extractToken(from request: Request) -> String? {
        // Try secure cookie first, then non-secure
        let cookieNames = ["__Secure-authjs.session-token", "authjs.session-token"]

        for baseName in cookieNames {
            // Try chunked cookies first (name.0, name.1, ...)
            let chunked = assembleChunkedCookie(from: request, baseName: baseName)
            if let token = chunked, !token.isEmpty {
                return token
            }

            // Try single (non-chunked) cookie
            if let token = request.cookies[baseName]?.string, token.split(separator: ".", omittingEmptySubsequences: false).count == 5 {
                return token
            }
        }

        // Try Authorization: Bearer <token>
        if let bearer = request.headers.bearerAuthorization {
            return bearer.token
        }

        return nil
    }

    /// Assembles chunked cookies: `baseName.0` + `baseName.1` + `baseName.2` + ...
    private func assembleChunkedCookie(from request: Request, baseName: String) -> String? {
        var chunks: [String] = []
        var index = 0

        while let chunk = request.cookies["\(baseName).\(index)"]?.string {
            chunks.append(chunk)
            index += 1
        }

        guard !chunks.isEmpty else { return nil }
        return chunks.joined()
    }

    /// Determines the HKDF salt based on which cookie was used.
    private func determineSalt(from request: Request) -> String {
        // Check secure cookie (chunked or single)
        if request.cookies["__Secure-authjs.session-token.0"] != nil ||
           request.cookies["__Secure-authjs.session-token"] != nil {
            return "__Secure-authjs.session-token"
        }
        return "authjs.session-token"
    }

    // MARK: - HKDF Key Derivation

    /// Derives 64-byte encryption key using HKDF, matching NextAuth's implementation:
    /// ```js
    /// hkdf("sha256", keyMaterial, salt, `Auth.js Generated Encryption Key (${salt})`, 64)
    /// ```
    private func deriveEncryptionKey(secret: String, salt: String) throws -> Data {
        let ikm = Crypto.SymmetricKey(data: Data(secret.utf8))
        let saltData = Data(salt.utf8)
        let info = Data("Auth.js Generated Encryption Key (\(salt))".utf8)

        let derived = Crypto.HKDF<Crypto.SHA256>.deriveKey(
            inputKeyMaterial: ikm,
            salt: saltData,
            info: info,
            outputByteCount: 64
        )

        return derived.withUnsafeBytes { Data(Array($0)) }
    }

    // MARK: - JWE Decryption (A256CBC-HS512 with dir)

    /// Decrypts a JWE Compact Serialization token.
    ///
    /// JWE format: BASE64URL(header).BASE64URL(encryptedKey).BASE64URL(iv).BASE64URL(ciphertext).BASE64URL(tag)
    /// For `dir`: encryptedKey is empty, the HKDF-derived key IS the CEK.
    ///
    /// A256CBC-HS512 uses:
    /// - First 32 bytes of CEK → HMAC-SHA-512 key (for authentication tag)
    /// - Last 32 bytes of CEK → AES-256-CBC key (for decryption)
    private func decryptJWE(token: String, key: Data) throws -> NextAuthPayload {
        let parts = token.split(separator: ".", omittingEmptySubsequences: false)
        guard parts.count == 5 else {
            throw JWEError.invalidFormat("Expected 5 parts, got \(parts.count)")
        }

        let headerB64 = String(parts[0])
        // parts[1] = encrypted key (empty for `dir`)
        let ivB64 = String(parts[2])
        let ciphertextB64 = String(parts[3])
        let tagB64 = String(parts[4])

        // Decode base64url parts
        guard let headerData = base64URLDecode(headerB64),
              let iv = base64URLDecode(ivB64),
              let ciphertext = base64URLDecode(ciphertextB64),
              let tag = base64URLDecode(tagB64) else {
            throw JWEError.invalidBase64("Failed to decode base64url parts")
        }

        // Verify header
        if let headerJSON = try? JSONSerialization.jsonObject(with: headerData) as? [String: Any] {
            let alg = headerJSON["alg"] as? String
            let enc = headerJSON["enc"] as? String
            guard alg == "dir" else {
                throw JWEError.unsupportedAlgorithm("Expected 'dir', got '\(alg ?? "nil")'")
            }
            guard enc == "A256CBC-HS512" || enc == "A256GCM" else {
                throw JWEError.unsupportedAlgorithm("Expected 'A256CBC-HS512', got '\(enc ?? "nil")'")
            }
        }

        // A256CBC-HS512 key split:
        // CEK (64 bytes) = MAC key (first 32 bytes) || ENC key (last 32 bytes)
        guard key.count == 64 else {
            throw JWEError.invalidKey("CEK must be 64 bytes, got \(key.count)")
        }
        let macKey = key.prefix(32)    // HMAC-SHA-512 key
        let encKey = key.suffix(32)    // AES-256-CBC key

        // Verify authentication tag (HMAC-SHA-512)
        // AAD = ASCII(BASE64URL(header))
        let aad = Data(headerB64.utf8)
        // AL = 64-bit big-endian of AAD length in bits
        let aadLengthBits = UInt64(aad.count * 8)
        var al = Data(count: 8)
        al[0] = UInt8((aadLengthBits >> 56) & 0xFF)
        al[1] = UInt8((aadLengthBits >> 48) & 0xFF)
        al[2] = UInt8((aadLengthBits >> 40) & 0xFF)
        al[3] = UInt8((aadLengthBits >> 32) & 0xFF)
        al[4] = UInt8((aadLengthBits >> 24) & 0xFF)
        al[5] = UInt8((aadLengthBits >> 16) & 0xFF)
        al[6] = UInt8((aadLengthBits >> 8) & 0xFF)
        al[7] = UInt8(aadLengthBits & 0xFF)

        // HMAC input = AAD || IV || Ciphertext || AL
        var hmacInput = Data()
        hmacInput.append(aad)
        hmacInput.append(iv)
        hmacInput.append(ciphertext)
        hmacInput.append(al)

        let hmacKey = Crypto.SymmetricKey(data: macKey)
        let computedMAC = Crypto.HMAC<Crypto.SHA512>.authenticationCode(for: hmacInput, using: hmacKey)
        let computedTag = Data(Array(Data(computedMAC.map { $0 }))).prefix(32) // Truncate to first 32 bytes

        // Constant-time comparison
        guard computedTag.count == tag.count else {
            throw JWEError.authenticationFailed("Tag length mismatch")
        }
        var diff: UInt8 = 0
        for i in 0..<computedTag.count {
            diff |= computedTag[i] ^ tag[i]
        }
        guard diff == 0 else {
            throw JWEError.authenticationFailed("Authentication tag verification failed")
        }

        // Decrypt AES-256-CBC
        let aes = try AES(key: Array(encKey), blockMode: CBC(iv: Array(iv)), padding: .pkcs7)
        let decrypted = try aes.decrypt(Array(ciphertext))

        // Parse JSON payload
        let decoder = JSONDecoder()
        return try decoder.decode(NextAuthPayload.self, from: Data(decrypted))
    }

    // MARK: - Base64URL

    private func base64URLDecode(_ string: String) -> Data? {
        var base64 = string
            .replacingOccurrences(of: "-", with: "+")
            .replacingOccurrences(of: "_", with: "/")
        let remainder = base64.count % 4
        if remainder > 0 {
            base64 += String(repeating: "=", count: 4 - remainder)
        }
        return Data(base64Encoded: base64)
    }
}

// MARK: - Error Types

enum JWEError: Error, CustomStringConvertible {
    case invalidFormat(String)
    case invalidBase64(String)
    case unsupportedAlgorithm(String)
    case invalidKey(String)
    case authenticationFailed(String)

    var description: String {
        switch self {
        case .invalidFormat(let msg): return "JWE Format: \(msg)"
        case .invalidBase64(let msg): return "JWE Base64: \(msg)"
        case .unsupportedAlgorithm(let msg): return "JWE Algorithm: \(msg)"
        case .invalidKey(let msg): return "JWE Key: \(msg)"
        case .authenticationFailed(let msg): return "JWE Auth: \(msg)"
        }
    }
}
