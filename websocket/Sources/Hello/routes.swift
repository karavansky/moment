import Fluent
import Vapor

func routes(_ app: Application) throws {
    // Health check
    app.get("health") { req in
        return ["status": "ok"]
    }

    // Server statistics endpoint for monitoring
    app.get("server-stats") { req async throws -> String in
        let wsManager = req.application.wsManager
        let activeConnections = wsManager.getActiveConnectionsCount()
        let userSessions = wsManager.getUserSessionsCount()

        let totalUsers = try await User.query(on: req.db).count()
        let onlineUsers = try await User.query(on: req.db).filter(\.$isOnline == true).count()

        // Get session statistics from Redis
        let totalSessions = try await req.sessionManager.getActiveSessionsCount()
        let activeSessions = totalSessions  // All Redis sessions are active (expired ones auto-deleted)

        let stats = """
            ╔═══════════════════════════════════════════════════════════╗
            ║         VAPOR WEBSOCKET SERVER STATISTICS                 ║
            ╠═══════════════════════════════════════════════════════════╣
            ║ Time: \(Date())                                            
            ╠═══════════════════════════════════════════════════════════╣
            ║ WebSocket Connections:                                    ║
            ║   • Active Connections:        \(String(format: "%4d", activeConnections))                          ║
            ║   • Unique Users Connected:    \(String(format: "%4d", userSessions))                          ║
            ╠═══════════════════════════════════════════════════════════╣
            ║ Database Statistics:                                      ║
            ║   • Total Users:               \(String(format: "%4d", totalUsers))                          ║
            ║   • Online Users:              \(String(format: "%4d", onlineUsers))                          ║
            ║   • Total Sessions (Redis):    \(String(format: "%4d", totalSessions))                          ║
            ║   • Active Sessions (valid):   \(String(format: "%4d", activeSessions))                          ║
            ╠═══════════════════════════════════════════════════════════╣
            ║ Performance Metrics:                                      ║
            ║   • Connections per User:      \(String(format: "%.2f", userSessions > 0 ? Double(activeConnections) / Double(userSessions) : 0))                           ║
            ║   • Session Hit Rate:          \(String(format: "%3.0f", totalSessions > 0 ? Double(activeSessions) * 100 / Double(totalSessions) : 0))%%                         ║
            ╚═══════════════════════════════════════════════════════════╝

            To see system resources, run in terminal:
            $ top -b -n 1 | grep WebSocketServer
            $ ps aux | grep WebSocketServer
            """

        return stats
    }

    // Get user status history
    app.get("user", "status-history") { req async throws -> [UserStatusHistoryResponse] in
        guard let username = try? req.query.get(String.self, at: "username") else {
            throw Abort(.badRequest, reason: "Username parameter is required")
        }

        let history = try await UserStatusHistory.query(on: req.db)
            .filter(\.$username == username)
            .sort(\.$timestamp, .descending)
            .all()

        return history.map { record in
            UserStatusHistoryResponse(
                username: record.username,
                isOnline: record.isOnline,
                timestamp: record.timestamp?.timeIntervalSince1970 ?? 0
            )
        }
    }

    // Debug route
    app.get("status-test") { req async throws -> String in
        let count = try await UserStatusHistory.query(on: req.db).count()
        return "Count: \(count)"
    }

    // Test simple string
    app.get("status-simple") { req async throws -> String in
        let history = try await UserStatusHistory.query(on: req.db).all()
        return "Count: \(history.count), First: \(history.first?.username ?? "none")"
    }
    // Test all records
    app.get("status-all") { req async throws -> [UserStatusHistoryResponse] in
        let history = try await UserStatusHistory.query(on: req.db).all()
        return history.map { record in
            UserStatusHistoryResponse(
                username: record.username,
                isOnline: record.isOnline,
                timestamp: record.timestamp?.timeIntervalSince1970 ?? 0
            )
        }
    }
    // Register
    app.post("register") { req async throws -> AuthResponse in
        let registerData = try req.content.decode(RegisterRequest.self)

        // Check if user exists
        if (try await User.query(on: req.db)
            .filter(\.$username == registerData.username)
            .first()) != nil
        {
            throw Abort(.conflict, reason: "Username already exists")
        }

        // Hash password
        let passwordHash = try Bcrypt.hash(registerData.password)

        // Create user (set empty token for DB compatibility)
        let user = User(
            username: registerData.username, passwordHash: passwordHash, token: "",
            host: registerData.host)
        // Save to PostgreSQL
        try await user.save(on: req.db)

        // NOTE: We don't create a session here anymore for administrative user creation.
        // Users must login explicitly to get a session.
        // Return empty sessionId to maintain API compatibility
        return AuthResponse(
            username: registerData.username,
            sessionId: "",
            expiresAt: nil
        )
    }

    // Fast login for load testing (DEVELOPMENT ONLY - no password verification!)
    app.post("fast-login") { req async throws -> AuthResponse in
        // let startTime = Date()  // [PERF]
        do {
            //let afterDecode = Date()  // [PERF]
            let loginData = try req.content.decode(LoginRequest.self)
            //let decodeTime = afterDecode.timeIntervalSince(startTime) * 1000 // [PERF]

            // Find user (no password verification for speed!)
            //let beforeDB = Date()  // [PERF]
            guard
                let user = try await User.query(on: req.db)
                    .filter(\.$username == loginData.username)
                    .first()
            else {
                req.logger.warning(
                    "Fast-login failed: user not found - username='\(loginData.username)'")
                throw Abort(.unauthorized, reason: "Invalid credentials")
            }
            //let afterDB = Date()  // [PERF]
            //let dbTime = afterDB.timeIntervalSince(beforeDB) * 1000  // [PERF]

            // Create session in Redis (cleanup is skipped by default, runs only on ping/pong timeout)
            // let beforeRedis = Date()  // [PERF]
            let expiresIn: TimeInterval = 86400
            let sessionId = try await req.sessionManager.createSession(
                username: user.username, expiresIn: expiresIn)
            let expiresAt = Date().timeIntervalSince1970 + expiresIn
            //let afterRedis = Date()  // [PERF]
            // let redisTime = afterRedis.timeIntervalSince(beforeRedis) * 1000  // [PERF]

            // let totalTime = afterRedis.timeIntervalSince(startTime) * 1000  // [PERF]
            // print("[PERF /fast-login] Decode=\(String(format: "%.1f", decodeTime))ms, DB=\(String(format: "%.1f", dbTime))ms, Redis=\(String(format: "%.1f", redisTime))ms, Total=\(String(format: "%.1f", totalTime))ms")

            return AuthResponse(
                username: user.username,
                sessionId: sessionId,
                expiresAt: expiresAt
            )
        } catch let error as Abort {
            throw error
        } catch {
            req.logger.error("Fast-login error: \(error)")
            throw Abort(.internalServerError, reason: "Login failed: \(error.localizedDescription)")
        }
    }

    // Login
    app.post("login") { req async throws -> AuthResponse in
        //let startTime = Date()  // [PERF]
        do {
            //let afterDecode = Date()  // [PERF]
            let loginData = try req.content.decode(LoginRequest.self)
            // let decodeTime = afterDecode.timeIntervalSince(startTime) * 1000  // [PERF]

            // Find user
            //let beforeDB = Date()  // [PERF]
            guard
                let user = try await User.query(on: req.db)
                    .filter(\.$username == loginData.username)
                    .first()
            else {
                req.logger.warning(
                    "Login failed: user not found - username='\(loginData.username)'")
                throw Abort(.unauthorized, reason: "Invalid credentials")
            }
            // let afterDB = Date()  // [PERF]
            // let dbTime = afterDB.timeIntervalSince(beforeDB) * 1000  // [PERF]

            // Verify password
            // let beforeBcrypt = Date()  // [PERF]
            guard try Bcrypt.verify(loginData.password, created: user.passwordHash) else {
                req.logger.warning(
                    "Login failed: wrong password - username='\(loginData.username)'")
                throw Abort(.unauthorized, reason: "Invalid credentials")
            }
            // let afterBcrypt = Date()  // [PERF]
            // let bcryptTime = afterBcrypt.timeIntervalSince(beforeBcrypt) * 1000  // [PERF]

            // Create new session in Redis
            //let beforeRedis = Date()  // [PERF]
            let expiresIn: TimeInterval = 86400
            let sessionId = try await req.sessionManager.createSession(
                username: user.username, expiresIn: expiresIn)
            let expiresAt = Date().timeIntervalSince1970 + expiresIn
            //let afterRedis = Date()  // [PERF]
            // let redisTime = afterRedis.timeIntervalSince(beforeRedis) * 1000  // [PERF]

            // let totalTime = afterRedis.timeIntervalSince(startTime) * 1000  // [PERF]
            // print("[PERF /login] Decode=\(String(format: "%.1f", decodeTime))ms, DB=\(String(format: "%.1f", dbTime))ms, Bcrypt=\(String(format: "%.1f", bcryptTime))ms, Redis=\(String(format: "%.1f", redisTime))ms, Total=\(String(format: "%.1f", totalTime))ms")

            return AuthResponse(
                username: user.username,
                sessionId: sessionId,
                expiresAt: expiresAt
            )
        } catch let error as Abort {
            throw error
        } catch {
            req.logger.error("Login error: \(error)")
            throw Abort(.internalServerError, reason: "Login failed: \(error.localizedDescription)")
        }
    }

    // Logout - delete session and close WebSocket connections
    app.post("logout") { req async throws -> HTTPStatus in
        // Get sessionId from header or query
        guard
            let sessionId = req.headers.first(name: "X-Session-ID")
                ?? (try? req.query.get(String.self, at: "sessionId"))
        else {
            throw Abort(
                .badRequest,
                reason: "Session ID required in X-Session-ID header or sessionId query parameter")
        }

        // Get session from Redis
        guard let session = try await req.sessionManager.getSession(sessionId: sessionId) else {
            throw Abort(.notFound, reason: "Session not found")
        }

        let username = session.username

        // Delete session from Redis
        try await req.sessionManager.deleteSession(sessionId: sessionId)

        // Close all WebSocket connections for this session
        req.application.wsManager.remove(
            sessionId: sessionId, database: req.db, userStatusCache: req.userStatusCache)

        req.logger.info("🚪 User '\(username)' logged out, sessionId='\(sessionId.prefix(8))...'")

        return .noContent
    }

    // Get user status history
    app.get("messages") { req async throws -> [Message] in
        guard let token = req.headers.bearerAuthorization?.token else {
            throw Abort(.unauthorized)
        }

        // Verify token
        guard
            (try await User.query(on: req.db)
                .filter(\.$token == token)
                .first()) != nil
        else {
            throw Abort(.unauthorized)
        }

        return try await Message.query(on: req.db)
            .sort(\.$createdAt, .descending)
            .limit(50)
            .all()
    }

    // Get user status history
    app.get("users") { req async throws -> [UserResponse] in
        let users = try await User.query(on: req.db)
            .sort(\.$isOnline, .descending)  // true (online) first, then false (offline)
            .sort(\.$username, .ascending)  // then alphabetically by username
            .all()

        // Get active sessions count for each user from Redis
        var userResponses: [UserResponse] = []
        for user in users {
            let activeSessions =
                (try? await req.sessionManager.getUserActiveSessionsCount(username: user.username))
                ?? 0
            userResponses.append(
                UserResponse(
                    username: user.username,
                    status: user.status,
                    isOnline: user.isOnline,
                    lastActivity: user.lastActivity,
                    host: user.host,
                    activeSessions: activeSessions
                ))
        }

        return userResponses
    }

    // Get user status history
    app.get("user") { req async throws -> [MessageResponse] in
        guard let username = try? req.query.get(String.self, at: "username") else {
            throw Abort(.badRequest, reason: "Username parameter is required")
        }

        let messages = try await Message.query(on: req.db)
            .filter(\.$username == username)
            .sort(\.$createdAt, .descending)
            .all()

        return messages.map { message in
            MessageResponse(
                id: message.id ?? UUID(),
                username: message.username,
                content: message.content,
                createdAt: message.createdAt ?? Date()
            )
        }
    }

    // Get user status history
    app.webSocket("chat") { req, ws in
        // let startTime = Date()  // [PERF]

        // Log connection attempt with IP and headers
        let clientIP = req.remoteAddress?.description ?? "unknown"
        let userAgent = req.headers.first(name: "User-Agent") ?? "unknown"

        // Get sessionId from query
        guard let sessionId = try? req.query.get(String.self, at: "sessionId") else {
            req.logger.warning(
                "❌ WebSocket rejected: No sessionId provided. IP: \(clientIP), User-Agent: \(userAgent)"
            )
            _ = ws.close(code: .policyViolation)
            return
        }

        // let afterParse = Date()  // [PERF]

        // Validate session in Redis using EventLoopFuture
        let sessionFuture: EventLoopFuture<SessionData?> = req.eventLoop.makeFutureWithTask {
            // let redisStart = Date()  // [PERF]
            let session: SessionData? = try await req.sessionManager.getSession(sessionId: sessionId)
            // let redisEnd = Date()  // [PERF]
            // let redisTime = redisEnd.timeIntervalSince(redisStart) * 1000  // [PERF]
            // print("[PERF] Redis getSession took \(String(format: "%.1f", redisTime))ms")
            return session
        }

        sessionFuture.whenComplete { result in
            // let afterRedis = Date()  // [PERF]
            // let redisTotal = afterRedis.timeIntervalSince(afterParse) * 1000
            // print("[PERF] Total Redis future time: \(String(format: "%.1f", redisTotal))ms")
            guard case .success(let session?) = result else {
                req.logger.warning(
                    "❌ WebSocket rejected: Invalid or expired sessionId '\(sessionId.prefix(8))...'. IP: \(clientIP), User-Agent: \(userAgent)"
                )
                _ = ws.close(code: .policyViolation)
                return
            }

            // Update session activity
            _ = req.eventLoop.makeFutureWithTask {
                try? await req.sessionManager.updateActivity(sessionId: sessionId)
            }

            // Log successful connection
            req.logger.info(
                "✅ WebSocket connected: user='\(session.username)', sessionId='\(sessionId.prefix(8))...', IP: \(clientIP), User-Agent: \(userAgent), isClosed=\(ws.isClosed)"
            )

            // Add to manager
            req.application.wsManager.add(
                sessionId: sessionId, socket: ws, username: session.username, database: req.db)
            let host: String? = req.headers.first(name: .host)
            // Send welcome message (optimized with short keys)
            let welcomeMsg = WSMessageShort(
                type: "system",
                content: "Welcome, \(session.username)! Host: \(host ?? "unknown")",
                username: nil,
                timestamp: Date().timeIntervalSince1970,
                host: host ?? nil
            )
            let welcomeData = String(data: try! JSONEncoder().encode(welcomeMsg), encoding: .utf8)!

            if ws.isClosed {
                req.logger.warning(
                    "⚠️ WebSocket already closed before welcome message! sessionId='\(sessionId.prefix(8))...'"
                )
                return
            }

            req.logger.info("📤 Sending welcome message to sessionId='\(sessionId.prefix(8))...'")
            // let beforeSend = Date()  // [PERF]
            ws.send(welcomeData, promise: nil)
            // let afterSend = Date()  // [PERF]
            // let sendTime = afterSend.timeIntervalSince(beforeSend) * 1000  // [PERF]

            // let totalTime = afterSend.timeIntervalSince(startTime) * 1000  // [PERF]
            // print("[PERF] Welcome send took \(String(format: "%.1f", sendTime))ms, total connection time: \(String(format: "%.1f", totalTime))ms")

            // Broadcast join and status in background (non-blocking) - optimized with short keys
            _ = req.eventLoop.makeFutureWithTask {
                let joinMsg = WSMessageShort(
                    type: "join",
                    content: "\(session.username) joined the chat",
                    username: session.username,
                    timestamp: Date().timeIntervalSince1970,
                    host: host ?? nil
                )

                req.application.wsManager.broadcastMessage(
                    message: String(data: try! JSONEncoder().encode(joinMsg), encoding: .utf8)!,
                    messageType: "system_events",
                    fromUsername: session.username,
                    exceptSessionId: sessionId
                )

                // Broadcast user status online (optimized)
                let statusMsg = WSMessageShort(
                    type: "user_status",
                    content: "online",
                    username: session.username,
                    timestamp: Date().timeIntervalSince1970,
                    host: host ?? nil
                )
                req.application.wsManager.broadcastMessage(
                    message: String(data: try! JSONEncoder().encode(statusMsg), encoding: .utf8)!,
                    messageType: "user_status",
                    fromUsername: session.username
                )
            }
ws.onText { ws, text in
    // 1. Быстрый выход для простых PING/PONG (самый частый трафик)
    if text == "ping" {
        // Ответ без дальнейшей обработки
        if !ws.isClosed { ws.send("pong", promise: nil) }
        
        // Переходим к обновлению активности
        // updateSessionActivity(req: req, sessionId: sessionId, session: session)
        // ПРОВЕРКА THROTTLING
        if req.application.wsManager.shouldUpdateActivity(sessionId: sessionId) {
            updateSessionActivity(req: req, sessionId: sessionId, session: session)
            req.application.wsManager.markActivityUpdated(sessionId: sessionId) // Отмечаем, что обновили
        }
        return
    }

    if text == "pong" {
        // Переходим к обновлению активности
        // updateSessionActivity(req: req, sessionId: sessionId, session: session)
        // ПРОВЕРКА THROTTLING
        if req.application.wsManager.shouldUpdateActivity(sessionId: sessionId) {
            updateSessionActivity(req: req, sessionId: sessionId, session: session)
            req.application.wsManager.markActivityUpdated(sessionId: sessionId) // Отмечаем, что обновили
        }
        return
    }

    // 2. Декодирование JSON-сообщения (Single Source of Truth)
    guard let data = text.data(using: .utf8),
          let baseMessage = try? JSONDecoder().decode(BaseMessage.self, from: data) 
    else {
        // Обновление активности даже при неверном сообщении
        updateSessionActivity(req: req, sessionId: sessionId, session: session)
        req.logger.warning("Failed to decode message or convert text to data: \(text)")
        return
    }

    // 3. Обновление активности для всех JSON-сообщений
   // updateSessionActivity(req: req, sessionId: sessionId, session: session)


    // 4. Обработка по типу сообщения
    switch baseMessage.type {
    
    case "ping", "pong":
        // Обработка Legacy JSON ping/pong
        if baseMessage.type == "ping" && !ws.isClosed {
            ws.send("pong", promise: nil)
        }
        return

    case "latency_ping":
        handleLatencyPing(req: req, ws: ws, data: data, sessionId: sessionId)
        return

    case "subscribe", "unsubscribe":
        handleSubscription(req: req, ws: ws, data: data, sessionId: sessionId, type: baseMessage.type)
        return

    case "cpu":
        handleCPUUpdate(req: req, data: data, session: session, sessionId: sessionId)
        return
        
    case "log":
        // Log messages - Save to DB and broadcast (Requires Bulk Insert/Throttling for performance!)
        handleLogMessage(req: req, text: text, session: session, host: host)
        return

    default:
        // Обработка любого другого сообщения (сохранение в БД)
   //     handleDefaultMessage(req: req, text: text, session: session, host: host)
        return
    }
}

            // Handle close
            ws.onClose.whenComplete { result in
                // Log disconnection with reason
                switch result {
                case .success:
                    req.logger.info(
                        "🔌 WebSocket disconnected (clean): user='\(session.username)', sessionId='\(sessionId.prefix(8))...', IP: \(clientIP)"
                    )
                case .failure(let error):
                    req.logger.warning(
                        "⚠️ WebSocket disconnected (error): user='\(session.username)', sessionId='\(sessionId.prefix(8))...', IP: \(clientIP), error: \(error)"
                    )
                }

                // Remove from manager (will set user offline only if last session)
                // Session remains in Redis (will expire automatically after 24h TTL)
                req.application.wsManager.remove(
                    sessionId: sessionId, database: req.db, userStatusCache: req.userStatusCache)

                // Broadcast leave (optimized with short keys)
                let leaveMsg = WSMessageShort(
                    type: "leave",
                    content: "\(session.username) left the chat",
                    username: session.username,
                    timestamp: Date().timeIntervalSince1970,
                    host: host ?? nil
                )
                req.application.wsManager.broadcastMessage(
                    message: String(data: try! JSONEncoder().encode(leaveMsg), encoding: .utf8)!,
                    messageType: "system_events",
                    fromUsername: session.username
                )

                // Broadcast user status offline only if no sessions left (optimized with short keys)
                // (WebSocketManager.remove already handles setting user offline)
                let statusMsg = WSMessageShort(
                    type: "user_status",
                    content: "offline",
                    username: session.username,
                    timestamp: Date().timeIntervalSince1970,
                    host: host ?? nil
                )
                req.application.wsManager.broadcastMessage(
                    message: String(data: try! JSONEncoder().encode(statusMsg), encoding: .utf8)!,
                    messageType: "user_status",
                    fromUsername: session.username
                )
            }
        }
    }

    // MARK: - User Management Endpoints

    // Delete user
    app.delete("users", ":username") { req async throws -> HTTPStatus in
        guard let username = req.parameters.get("username") else {
            throw Abort(.badRequest, reason: "Username parameter is required")
        }

        // Find user
        guard
            let user = try await User.query(on: req.db)
                .filter(\.$username == username)
                .first()
        else {
            throw Abort(.notFound, reason: "User not found")
        }

        // Delete user (cascade will delete sessions)
        try await user.delete(on: req.db)

        req.logger.info("User '\(username)' deleted")
        return .ok
    }

    // Update user password
    app.put("users", "password") { req async throws -> HTTPStatus in
        let updateData = try req.content.decode(UpdatePasswordRequest.self)

        // Find user
        guard
            let user = try await User.query(on: req.db)
                .filter(\.$username == updateData.username)
                .first()
        else {
            throw Abort(.notFound, reason: "User not found")
        }

        // Hash new password
        let newPasswordHash = try Bcrypt.hash(updateData.newPassword)
        user.passwordHash = newPasswordHash

        // Save to database
        try await user.save(on: req.db)

        req.logger.info("Password updated for user '\(updateData.username)'")
        return .ok
    }

    // Update user host
    app.put("users", "host") { req async throws -> HTTPStatus in
        let updateData = try req.content.decode(UpdateHostRequest.self)

        // Find user
        guard
            let user = try await User.query(on: req.db)
                .filter(\.$username == updateData.username)
                .first()
        else {
            throw Abort(.notFound, reason: "User not found")
        }

        // Update host
        user.host = updateData.host

        // Save to database
        try await user.save(on: req.db)

        req.logger.info(
            "Host updated for user '\(updateData.username)' to '\(updateData.host ?? "null")'")
        return .ok
    }

}


// MARK: - ✂️ Вспомогательные Функции (Для лучшей изоляции логики)
/// Обработка сообщений latency_ping
fileprivate func handleLatencyPing(req: Request, ws: WebSocket, data: Data, sessionId: String) {
    // Декодируем сообщение с меткой времени, которую клиент хочет получить обратно
    guard let latencyPingMsg = try? JSONDecoder().decode(LatencyPingMessage.self, from: data) 
    else {
        req.logger.warning("[WebSocket] Failed to decode latency_ping message.")
        return
    }

    // Создаем ответное сообщение (pong) с оригинальной меткой времени
    let latencyPongMsg = WSMessageShort(
        type: "latency_pong",
        content: String(latencyPingMsg.clientTimestamp), // Отправляем обратно метку времени клиента
        username: nil,
        timestamp: Date().timeIntervalSince1970, // Добавляем метку времени сервера
        host: nil
    )

    // Кодируем и отправляем
    guard let encodedData = try? JSONEncoder().encode(latencyPongMsg),
          let encodedText = String(data: encodedData, encoding: .utf8)
    else {
        req.logger.error("[WebSocket] Failed to encode latency_pong message.")
        return
    }
    
    guard !ws.isClosed else { return }
    ws.send(encodedText, promise: nil)
}
/// Выполняет обновление активности сессии (единая точка входа)
/// В идеале, логика Throttling (ограничения частоты) должна быть внутри sessionManager.updateActivity.
fileprivate func updateSessionActivity(req: Request, sessionId: String, session: SessionData) {
    // 1. Асинхронное обновление в Redis (с ограничением частоты)
    _ = req.eventLoop.makeFutureWithTask {
        do {
            // Внутри sessionManager.updateActivity должна быть проверка, 
            // не прошло ли, например, 5 секунд с момента последнего обновления Redis.
            try await req.sessionManager.updateActivity(sessionId: sessionId)
        } catch {
            req.logger.error("❌ Failed to update activity for session '\(sessionId.prefix(8))...': \(error)")
        }
    }
    
    // 2. Локальное обновление в памяти (всегда)
    req.application.wsManager.updateActivity(
        sessionId: sessionId, database: req.db, userStatusCache: req.userStatusCache
    )

    // 3. Обновление isOnline статуса в кэше (только если это необходимо)
    _ = req.eventLoop.makeFutureWithTask {
        try? await req.userStatusCache.updateUserStatus(
            username: session.username,
            isOnline: true
        )
    }
}

/// Обработка сообщений типа subscribe/unsubscribe
fileprivate func handleSubscription(req: Request, ws: WebSocket, data: Data, sessionId: String, type: String) {
// ИСПРАВЛЕНИЕ: Присваиваем замыкание, которое содержит вызов правильного метода.
    // Это обходит проблему несовместимости сигнатур методов.
    let action: (String, String) -> Void = 
        (type == "subscribe") 
            ? { sID, mType in req.application.wsManager.subscribe(sessionId: sID, to: mType) }
            : { sID, mType in req.application.wsManager.unsubscribe(sessionId: sID, from: mType) }
//    let action: (String, String) -> Void = 
//        (type == "subscribe") ? req.application.wsManager.subscribe : req.application.wsManager.unsubscribe

    if let subscriptionData = try? JSONDecoder().decode([String: String].self, from: data),
        let messageType = subscriptionData["messageType"]
    {
        action(sessionId, messageType)
        
        // Оптимизированный ответ
        let ackResponse = WSMessageShort(
            type: (type == "subscribe") ? "subscribed" : "unsubscribed",
            content: messageType,
            username: nil,
            timestamp: Date().timeIntervalSince1970,
            host: nil
        )
        let ackData = String(data: try! JSONEncoder().encode(ackResponse), encoding: .utf8)!
        guard !ws.isClosed else { return }
        ws.send(ackData, promise: nil)
    }
}

/// Обработка сообщений о статусе CPU
fileprivate func handleCPUUpdate(req: Request, data: Data, session: SessionData, sessionId: String) {
    guard let cpuMessage = try? JSONDecoder().decode(CPUMessage.self, from: data),
          let cpuValue = Int(cpuMessage.message)
    else {
        req.logger.warning("Failed to decode CPU message: \(String(data: data, encoding: .utf8) ?? "invalid data")")
        return
    }

    // Обновление CPU status в кэше
    _ = req.eventLoop.makeFutureWithTask {
        try? await req.userStatusCache.updateUserStatus(
            username: session.username,
            isOnline: true,
            cpuStatus: cpuValue
        )
    }
// --- СЕРВЕРНОЕ ОГРАНИЧЕНИЕ ЧАСТОТЫ (THROTTLING) ---
    let broadcastMessageType = "cpu_status" 
    // Начинаем с 1.0 секунды. Даже если клиенты отправляют 1000 сообщений/с, 
    // рассылка произойдет только 1 раз в секунду.
    let throttleInterval: TimeInterval = 0.01 //.1 
    
    guard req.application.wsManager.shouldBroadcast(messageType: broadcastMessageType, interval: throttleInterval) else {
        // Если троттлинг блокирует рассылку, мы просто выходим (завершаем обработку сообщения).
        return 
    }
    // Широковещательная рассылка подписчикам (оптимизированный формат)
    let cpuStatusMsg = WSMessageShort(
        type: "cpu",
        content: String(cpuValue),
        username: session.username,
        timestamp: nil,
        host: nil
    )
    if let encodedData: Data = try? JSONEncoder().encode(cpuStatusMsg),
       let encoded: String = String(data: encodedData, encoding: .utf8)
    {
        req.application.wsManager.broadcastToSubscribers(
            message: encoded,
            messageType: "cpu_status",
            exceptSessionId: sessionId
        )
    } else {
        req.logger.error("[WebSocket] Failed to encode CPU status message")
    }
}

/// Обработка log-сообщений (критический путь для I/O)
fileprivate func handleLogMessage(req: Request, text: String, session: SessionData, host: String?) {
    req.logger.info("Detected log message, saving to DB and broadcasting")

    // !!! ВАЖНО: Удалена неэффективная логика проверки и сохранения isOnline
    
    // Сохранение и широковещательная рассылка
    let message = Message(username: session.username, content: text)
    
    // Асинхронное сохранение в PostgreSQL (РЕКОМЕНДУЕТСЯ ЗАМЕНИТЬ НА BULK INSERT)
    message.save(on: req.db).whenComplete { _ in
        // Широковещательная рассылка после сохранения
        let broadcastMsg = WSMessageShort(
            type: "message",
            content: text,
            username: session.username,
            timestamp: Date().timeIntervalSince1970,
            host: host ?? nil
        )
        if let jsonData = try? JSONEncoder().encode(broadcastMsg) {
            req.application.wsManager.broadcastMessage(
                message: String(data: jsonData, encoding: .utf8)!,
                messageType: "all_messages",
                fromUsername: session.username
            )
        } else {
            req.logger.error("[WebSocket] Failed to encode log message for broadcasting")
        }
    }
}

/// Обработка сообщений по умолчанию (сохранение в БД)
fileprivate func handleDefaultMessage(req: Request, text: String, session: SessionData, host: String?) {
    // Save regular message asynchronously
    let message: Message = Message(username: session.username, content: text)
    
    // Асинхронное сохранение в PostgreSQL
    message.save(on: req.db).whenComplete { _ in
        // Broadcast after save
        let broadcastMsg = WSMessageShort(
            type: "message",
            content: text,
            username: session.username,
            timestamp: Date().timeIntervalSince1970,
            host: host ?? nil
        )
        let jsonData = try! JSONEncoder().encode(broadcastMsg)
        req.application.wsManager.broadcastMessage(
            message: String(data: jsonData, encoding: .utf8)!,
            messageType: "all_messages",
            fromUsername: session.username
        )
    }
}

// ... остальная часть кода маршрутов