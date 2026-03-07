// MARK: - Рефакторинг ws.onText

ws.onText { req, ws, text in
    // 1. Быстрый выход для простых PING/PONG (самый частый трафик)
    if text == "ping" {
        // Ответ без дальнейшей обработки
        if !ws.isClosed { ws.send("pong", promise: nil) }
        
        // Переходим к обновлению активности
        updateSessionActivity(req: req, sessionId: sessionId, session: session)
        return
    }

    if text == "pong" {
        // Переходим к обновлению активности
        updateSessionActivity(req: req, sessionId: sessionId, session: session)
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
    updateSessionActivity(req: req, sessionId: sessionId, session: session)


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
        handleDefaultMessage(req: req, text: text, session: session, host: host)
        return
    }
}


// MARK: - ✂️ Вспомогательные Функции (Для лучшей изоляции логики)

/// Выполняет обновление активности сессии (единая точка входа)
/// В идеале, логика Throttling (ограничения частоты) должна быть внутри sessionManager.updateActivity.
private func updateSessionActivity(req: Request, sessionId: String, session: Session) {
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
private func handleSubscription(req: Request, ws: WebSocket, data: Data, sessionId: String, type: String) {
    let action: (String, String) -> Void = 
        (type == "subscribe") ? req.application.wsManager.subscribe : req.application.wsManager.unsubscribe

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
private func handleCPUUpdate(req: Request, data: Data, session: Session, sessionId: String) {
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
private func handleLogMessage(req: Request, text: String, session: Session, host: String?) {
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
private func handleDefaultMessage(req: Request, text: String, session: Session, host: String?) {
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