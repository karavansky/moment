import Fluent
import NIOCore
import Vapor

struct WebSocketManagerKey: StorageKey {
    typealias Value = WebSocketManager
}
/// Thread-safe manager that stores each WebSocket together with its EventLoop.
/// All operations are executed on the associated EventLoop to avoid crossing event loops.
/// Supports multiple WebSocket connections per user (different sessions).
///
/// Performance optimizations:
/// - Uses pthread_rwlock for read-write locking (allows concurrent reads)
/// - Pre-encodes JSON messages to avoid repeated encoding for broadcasts
final class WebSocketManager: @unchecked Sendable {
    // sessionId -> (WebSocket, EventLoop, lastActivity, username)
    private var clients:
        [String: (ws: WebSocket, el: any EventLoop, lastActivity: Date, username: String)] = [:]

    // username -> Set of sessionIds (for multiple connections per user)
    private var userSessions: [String: Set<String>] = [:]

    // sessionId -> set of message types
    private var subscriptions: [String: Set<String>] = [:]
    
    // НОВЫЙ ИНВЕРТИРОВАННЫЙ ИНДЕКС:
    // Тип сообщения -> Набор SessionId, подписанных на этот тип
    private var subscribersByType: [String: Set<String>] = [:]
    private var lastActivityUpdate: [String: Date] = [:] // SessionId: Date
    private let activityThrottleInterval: TimeInterval = 10.0 // Обновлять не чаще, чем раз в 10 секунд
    // НОВОЕ СВОЙСТВО: отслеживает время последней рассылки для каждого типа сообщения
    private var lastBroadcastTime: [String: Date] = [:] // messageType: Date

    // sessionId -> when we sent last ping
    private var lastPingSent: [String: Date] = [:]

    // username -> when we last synced User.lastActivity to SQLite
    private var lastUserActivitySync: [String: Date] = [:]

    // Read-write lock for better concurrency (allows multiple readers)
    private var rwlock: pthread_rwlock_t
    private var pingTimer: RepeatedTask?

    init() {
        // Initialize read-write lock
        rwlock = pthread_rwlock_t()
        pthread_rwlock_init(&rwlock, nil)
    }

    deinit {
        pthread_rwlock_destroy(&rwlock)
    }

    // MARK: - Lock helpers

    @inline(__always)
    private func readLock() {
        pthread_rwlock_rdlock(&rwlock)
    }

    @inline(__always)
    private func writeLock() {
        pthread_rwlock_wrlock(&rwlock)
    }

    @inline(__always)
    private func unlock() {
        pthread_rwlock_unlock(&rwlock)
    }
    /// Проверяет, можно ли выполнить рассылку для данного типа сообщения, 
    /// и, если да, обновляет метку времени.
    func shouldBroadcast(messageType: String, interval: TimeInterval) -> Bool {
        writeLock() // Используем writeLock, так как мы ИЗМЕНЯЕМ состояние
        defer { unlock() }
        
        let now = Date()
        let lastTime = lastBroadcastTime[messageType] ?? .distantPast

        // Проверяем, прошло ли достаточно времени
        if now.timeIntervalSince(lastTime) >= interval {
            // Разрешаем рассылку и обновляем метку времени
            lastBroadcastTime[messageType] = now
            return true
        } else {
            // Рассылка была слишком недавно
            return false
        }
    }
/// Проверяет, прошло ли достаточно времени с последнего обновления активности
    func shouldUpdateActivity(sessionId: String) -> Bool {
        readLock()
        defer { unlock() }
        
        guard let lastUpdate = lastActivityUpdate[sessionId] else {
            // Если нет записи, нужно обновить (первый раз)
            return true
        }
        
        return Date().timeIntervalSince(lastUpdate) >= activityThrottleInterval
    }
    
    /// Обновляет метку времени последнего обновления (вызывается, когда обновление действительно произошло)
    func markActivityUpdated(sessionId: String) {
        writeLock()
        defer { unlock() }
        lastActivityUpdate[sessionId] = Date()
    }

    func add(sessionId: String, socket: WebSocket, username: String, database: any Database) {
        writeLock()

        // Add to clients
        clients[sessionId] = (socket, socket.eventLoop, Date(), username)

        // Add to userSessions index
        if userSessions[username] == nil {
            userSessions[username] = []
        }
        userSessions[username]?.insert(sessionId)

        let sessionCount = userSessions[username]?.count ?? 0
        let totalClients = clients.count
        unlock()

        print(
            "[WebSocketManager] Session '\(sessionId.prefix(8))...' added for user '\(username)'. User has \(sessionCount) session(s), total clients: \(totalClients)"
        )

        // Update user online status (only for first session)
        if sessionCount == 1 {
            User.query(on: database)
                .filter(\.$username == username)
                .first()
                .whenComplete { result in
                    if case .success(let user?) = result {
                        // Only record status change if user was offline
                        let wasOffline = !user.isOnline

                        user.isOnline = true
                        user.lastActivity = Date()
                        user.update(on: database).whenComplete { _ in }

                        // Record status change to online
                        if wasOffline {
                            let statusHistory = UserStatusHistory(username: username, isOnline: true)
                            statusHistory.save(on: database).whenComplete { _ in }
                        }
                    }
                }
        }
    }

    func remove(sessionId: String, database: any Database, userStatusCache: UserStatusCache, sessionManager: SessionManager? = nil, deleteSession: Bool = false) {
        writeLock()

        guard let client = clients[sessionId] else {
            unlock()
            return
        }

        let username = client.username

        // Remove from clients
        clients.removeValue(forKey: sessionId)
        subscriptions.removeValue(forKey: sessionId)
        lastPingSent.removeValue(forKey: sessionId)
// 1. Получаем ВСЕ подписки сессии перед удалением из прямого индекса.
    // Это критически важный шаг для получения значений 'messageType'.
    let subscribedTypes = subscriptions[sessionId] ?? []

    // 2. Удаляем из ПРЯМЫХ ИНДЕКСОВ
    subscriptions.removeValue(forKey: sessionId)
    clients.removeValue(forKey: sessionId)
    lastPingSent.removeValue(forKey: sessionId) // На основе контекста вашей ошибки

    // 3. Удаляем из ИНВЕРТИРОВАННОГО ИНДЕКСА (subscribersByType)
    // ИТЕРИРУЕМ по всем типам, на которые была подписана сессия
    for messageType in subscribedTypes {
        // Теперь messageType определен в этой области видимости
        if var sessions = subscribersByType[messageType] {
            sessions.remove(sessionId)
            
            // Если набор сессий для этого типа пуст, удаляем сам ключ
            if sessions.isEmpty {
                subscribersByType.removeValue(forKey: messageType) 
            } else {
                subscribersByType[messageType] = sessions
            }
        }
    }
            // Remove from userSessions
        userSessions[username]?.remove(sessionId)
        if userSessions[username]?.isEmpty == true {
            userSessions.removeValue(forKey: username)
        }

        let remainingSessions = userSessions[username]?.count ?? 0
        let totalClients = clients.count
        unlock()

        print(
            "[WebSocketManager] Session '\(sessionId.prefix(8))...' removed for user '\(username)'. User has \(remainingSessions) session(s) left, total clients: \(totalClients)"
        )

        // Delete session from Redis only if explicitly requested (e.g., ping timeout or logout)
        // NOT on normal WebSocket close (page reload, navigation, etc.)
        if deleteSession, let sessionManager = sessionManager {
            Task {
                do {
                    // Use deleteSessionWithCleanup for timeout to also cleanup other expired sessions
                    try await sessionManager.deleteSessionWithCleanup(sessionId: sessionId)
                    print("[WebSocketManager] Deleted session '\(sessionId.prefix(8))...' from Redis with cleanup (reason: timeout)")
                } catch {
                    print("[WebSocketManager] Failed to delete session from Redis: \(error)")
                }
            }
        }

        // Set user offline ONLY if this was their last session
        if remainingSessions == 0 {
            // Final sync of User.lastActivity from Redis to SQLite before going offline
            self.syncUserActivityToDatabase(username: username, database: database, userStatusCache: userStatusCache)

            User.query(on: database)
                .filter(\.$username == username)
                .first()
                .whenComplete { result in
                    if case .success(let user?) = result {
                        user.isOnline = false
                        user.update(on: database).whenComplete { _ in }

                        // Record status change to offline
                        let statusHistory = UserStatusHistory(username: username, isOnline: false)
                        statusHistory.save(on: database).whenComplete { _ in }
                    }
                }

            // Clean up sync tracking
            writeLock()
            lastUserActivitySync.removeValue(forKey: username)
            unlock()
        }
    }

    func updateActivity(sessionId: String, database: any Database, userStatusCache: UserStatusCache) {
        writeLock()
        var username: String?
        var shouldSync = false

        if var client = clients[sessionId] {
            client.lastActivity = Date()
            clients[sessionId] = client
            username = client.username

            // Check if we should sync User.lastActivity to SQLite
            if let lastSync = lastUserActivitySync[client.username] {
                // Sync if more than 5 minutes elapsed
                shouldSync = Date().timeIntervalSince(lastSync) > 300
            } else {
                // First time for this user, sync after first ping/pong
                shouldSync = true
            }
        }
        unlock()

        // REMOVED: PostgreSQL Session updates - sessions are now in Redis only
        // This was causing 10k+ transactions/sec during load tests
        // Session activity is tracked in Redis via SessionManager.updateActivity()
        /*
        Session.query(on: database)
            .filter(\.$sessionId == sessionId)
            .first()
            .whenComplete { result in
                if case .success(let session?) = result {
                    session.refresh()  // Updates expiresAt and lastActivity
                    session.save(on: database).whenComplete { _ in }
                }
            }
        */

        // Sync User.lastActivity from Redis to SQLite if needed
        if shouldSync, let username = username {
            self.syncUserActivityToDatabase(username: username, database: database, userStatusCache: userStatusCache)
        }
    }

    /// Sync User.lastActivity from Redis cache to SQLite only if values differ
    /// Must be called with database from req.db to ensure userStatusCache is accessible via req.application
    private func syncUserActivityToDatabase(username: String, database: any Database, userStatusCache: UserStatusCache) {
        // This runs asynchronously to avoid blocking the hot path
        database.eventLoop.makeFutureWithTask {
            // Fetch current status from Redis
            guard let redisStatus = try? await userStatusCache.getUserStatus(username: username) else {
                return
            }

            let redisLastActivity = redisStatus.lastActivity

            // Fetch current User from SQLite
            guard let user = try? await User.query(on: database)
                .filter(\.$username == username)
                .first()
                .get() else {
                return
            }

            // Compare timestamps - only update if different (accounting for precision)
            let currentSQLiteActivity = user.lastActivity ?? Date(timeIntervalSince1970: 0)
            let timeDifference = abs(redisLastActivity.timeIntervalSince(currentSQLiteActivity))

            // Only update if difference is more than 1 second (avoid precision issues)
            if timeDifference > 1.0 {
                user.lastActivity = redisLastActivity
                try? await user.update(on: database).get()

                // Update sync timestamp
                self.writeLock()
                self.lastUserActivitySync[username] = Date()
                self.unlock()

                print("[WebSocketManager] Synced User.lastActivity for '\(username)' from Redis to SQLite (diff: \(Int(timeDifference))s)")
            }
        }.whenComplete { _ in }
    }

    func startPingTimer(on eventLoop: any EventLoop, database: any Database, userStatusCache: UserStatusCache, sessionManager: SessionManager) {
        // Start ping timer - send ping to all clients every 20 seconds
        // Uses scheduleRepeatedAsyncTask to wait for completion before next iteration
        print("[PingTimer] Starting ping timer with 20 second interval")
        pingTimer = eventLoop.scheduleRepeatedAsyncTask(
            initialDelay: .seconds(20),
            delay: .seconds(20)
        ) { task in
            print("[PingTimer] Timer fired at \(Date())")
            self.sendPingToAllClients(database: database, userStatusCache: userStatusCache, sessionManager: sessionManager)
            return eventLoop.makeSucceededFuture(())
        }
    }

    func stopPingTimer() {
        pingTimer?.cancel()
    }

    func startStaleUserCleanup(on eventLoop: any EventLoop, database: any Database) {
        // Clean up stale online users every 5 minutes
        // Users are considered stale if they have no active WebSocket connections
        print("[StaleUserCleanup] Starting cleanup timer (first run in 10s, then every 5 minutes)")
        _ = eventLoop.scheduleRepeatedAsyncTask(
            initialDelay: .seconds(10),  // First run after 10 seconds (for quick cleanup after restart)
            delay: .seconds(300)  // Then every 5 minutes
        ) { task in
            Task {
                do {
                    // Get all users marked as online
                    let onlineUsers = try await User.query(on: database)
                        .filter(\.$isOnline == true)
                        .all()

                    self.readLock()
                    let activeUsernames = Set(self.clients.values.map { $0.username })
                    self.unlock()

                    var cleaned = 0
                    for user in onlineUsers {
                        // If user is marked online but has no active WebSocket connections
                        if !activeUsernames.contains(user.username) {
                            user.isOnline = false
                            try await user.save(on: database)

                            // Record status change to offline
                            let statusHistory = UserStatusHistory(username: user.username, isOnline: false)
                            try await statusHistory.save(on: database)

                            cleaned += 1
                            print("[StaleUserCleanup] Marked '\(user.username)' as offline (no active connections)")
                        }
                    }

                    if cleaned > 0 {
                        print("[StaleUserCleanup] Cleaned \(cleaned) stale online users")
                    }
                } catch {
                    print("[StaleUserCleanup] Error during cleanup: \(error)")
                }
            }
            return eventLoop.makeSucceededFuture(())
        }
    }

    private func sendPingToAllClients(database: any Database, userStatusCache: UserStatusCache, sessionManager: SessionManager) {
        readLock()

        // First, check for clients that didn't respond to previous ping
        let now = Date()
        var inactiveSessions: [(sessionId: String, username: String)] = []
        var clientsNeedingPing:
            [(
                sessionId: String,
                client: (ws: WebSocket, el: any EventLoop, lastActivity: Date, username: String)
            )] = []

        print("[SendPing] Checking \(clients.count) clients for activity")

        for (sessionId, client) in clients {
            let timeSinceLastActivity = now.timeIntervalSince(client.lastActivity)

            if let lastPing = lastPingSent[sessionId] {
                // If we sent ping and client didn't update activity since then
                if client.lastActivity < lastPing {
                    // Client didn't respond to ping - mark as inactive
                    inactiveSessions.append((sessionId, client.username))
                }
            }

            // Only send ping if client hasn't been active recently (optimization)
            if timeSinceLastActivity >= 15.0 {
                clientsNeedingPing.append((sessionId, client))
            }
        }

        unlock()

        // Update lastPingSent only for clients we're actually pinging (needs write lock)
        writeLock()
        for (sessionId, _) in clientsNeedingPing {
            lastPingSent[sessionId] = now
        }
        unlock()

        // Close inactive connections and update database
        if !inactiveSessions.isEmpty {
            for (sessionId, _) in inactiveSessions {
                // Close WebSocket
                readLock()
                if let client = clients[sessionId] {
                    client.el.execute {
                        _ = client.ws.close(code: .goingAway)
                    }
                }
                unlock()

                // remove() will handle setting user offline if this is their last session
                // Delete session from Redis because client is not responding (timeout)
                self.remove(sessionId: sessionId, database: database, userStatusCache: userStatusCache, sessionManager: sessionManager, deleteSession: true)
            }
        }

        // Send ping only to clients that need it
        if !clientsNeedingPing.isEmpty {
            // Optimized: send simple "ping" string instead of JSON (75% less traffic)
            let pingMessage = "ping"
            for (sessionId, client) in clientsNeedingPing {
                client.el.execute {
                    // Check if WebSocket is still open before sending ping
                    guard !client.ws.isClosed else {
                        print("[SendPing] Skipping ping to closed session \(sessionId.prefix(8))...")
                        return
                    }
                    client.ws.send(pingMessage, promise: nil)
                }
            }
        }
    }

    func subscribe(sessionId: String, to messageType: String) {
        writeLock()
        defer { unlock() }
        if subscriptions[sessionId] == nil {
            subscriptions[sessionId] = []
        }
        subscriptions[sessionId]?.insert(messageType)
        // 2. Обновляем ИНВЕРТИРОВАННЫЙ ИНДЕКС (subscribersByType)
    var sessions = subscribersByType[messageType] ?? []
    sessions.insert(sessionId)
    subscribersByType[messageType] = sessions
    }

    func unsubscribe(sessionId: String, from messageType: String) {
        writeLock()
        defer { unlock() }
        subscriptions[sessionId]?.remove(messageType)
        // 2. Обновляем ИНВЕРТИРОВАННЫЙ ИНДЕКС (subscribersByType)
    if var sessions = subscribersByType[messageType] {
        sessions.remove(sessionId)
        if sessions.isEmpty {
            subscribersByType.removeValue(forKey: messageType) // Удаляем ключ, если больше нет подписчиков
        } else {
            subscribersByType[messageType] = sessions
        }
    }
    }

    func isSubscribed(sessionId: String, to messageType: String) -> Bool {
        readLock()
        defer { unlock() }
        return subscriptions[sessionId]?.contains(messageType) ?? false
    }

    func broadcast(message: String, exceptSessionId: String? = nil) {
        readLock()
        let targets: [(sessionId: String, ws: WebSocket, el: any EventLoop)] = clients.filter {
            $0.key != exceptSessionId
        }.map { (sessionId: $0.key, ws: $0.value.ws, el: $0.value.el) }
        unlock()

        for target: (sessionId: String, ws: WebSocket, el: any EventLoop) in targets {
            target.el.execute {
                // Check if WebSocket is still open before sending
                guard !target.ws.isClosed else {
                    print("[WebSocketManager] Skipping send to closed session \(target.sessionId.prefix(8))...")
                    return
                }

                // Send and handle potential errors gracefully
                target.ws.send(message, promise: nil)
            }
        }
    }

    func broadcastToSubscribers(
        message: String, messageType: String, exceptSessionId: String? = nil
    ) {
        readLock()
        let subscribedSessionIds: [String] = subscriptions.filter { sessionId, types in
            sessionId != exceptSessionId && types.contains(messageType)
        }.map { $0.key }

        let targets: [(sessionId: String, ws: WebSocket, el: any EventLoop)] = subscribedSessionIds.compactMap {
            sessionId in
            if let client: (ws: WebSocket, el: any EventLoop, lastActivity: Date, username: String) = clients[sessionId] {
                return (sessionId: sessionId, ws: client.ws, el: client.el)
            }
            return nil
        }
        unlock()

        for target: (sessionId: String, ws: WebSocket, el: any EventLoop) in targets {
            target.el.execute {
                // Check if WebSocket is still open before sending
                guard !target.ws.isClosed else {
                    print("[WebSocketManager] Skipping send to closed subscriber \(target.sessionId.prefix(8))...")
                    return
                }

                // Send with promise to catch errors
                target.ws.send(message, promise: nil)
            }
        }
    }

    /// Broadcast message to subscribers of specific message type OR from specific user
    /// Supports: "all_messages", "user:{username}", "system_events", "user_status", "cpu_status"
    func broadcastMessageOLD(
        message: String,
        messageType: String,
        fromUsername: String? = nil,
        exceptSessionId: String? = nil
    ) {
        readLock()

        // Build list of possible subscription patterns
        var subscriptionPatterns: Set<String> = [messageType]

        // If message is from a specific user, add user-specific pattern
        if let username = fromUsername {
            subscriptionPatterns.insert("user:\(username)")
        }

        // Find all sessions that are subscribed to any of the patterns
        let subscribedSessionIds = subscriptions.filter { sessionId, types in
            guard sessionId != exceptSessionId else { return false }
            // Check if subscribed to any of the patterns
            return !types.isDisjoint(with: subscriptionPatterns)
        }.map { $0.key }

        let targets: [(sessionId: String, ws: WebSocket, el: any EventLoop)] = subscribedSessionIds.compactMap {
            sessionId in
            if let client = clients[sessionId] {
                return (sessionId: sessionId, ws: client.ws, el: client.el)
            }
            return nil
        }
        unlock()

        for target in targets {
            target.el.execute {
                // Check if WebSocket is still open before sending
                guard !target.ws.isClosed else {
                    return
                }
                target.ws.send(message, promise: nil)
            }
        }
    }
/// Broadcast message to subscribers of specific message type OR from specific user
/// СКОРОСТЬ: O(P), где P - количество паттернов (обычно 1 или 2).
func broadcastMessage(
    message: String,
    messageType: String,
    fromUsername: String? = nil,
    exceptSessionId: String? = nil
) {
    readLock()

    // 1. Строим список паттернов подписки, как и раньше
    var subscriptionPatterns: Set<String> = [messageType]
    if let username = fromUsername {
        // Добавляем паттерн, специфичный для пользователя, например, "user:Alice"
        subscriptionPatterns.insert("user:\(username)")
    }
    
    // --- НАЧАЛО ОПТИМИЗАЦИИ С ИНВЕРТИРОВАННЫМ ИНДЕКСОМ ---
    
    // 2. Инициализируем набор, который будет содержать всех уникальных получателей
    var targetsSet: Set<String> = []
    
    // 3. Быстрый поиск: Итерируем только по 1-2 паттернам и извлекаем готовые наборы SessionId
    for pattern in subscriptionPatterns {
        if let sessionIdsForPattern = subscribersByType[pattern] {
            // Быстрое объединение наборов (Union)
            targetsSet.formUnion(sessionIdsForPattern)
        }
    }
    
    // 4. Удаляем отправителя, если он указан
    if let exceptId = exceptSessionId {
        targetsSet.remove(exceptId)
    }

    // 5. Конвертируем финальный набор SessionId в список целей (WebSocket, EventLoop)
    let targets: [(sessionId: String, ws: WebSocket, el: any EventLoop)] = targetsSet.compactMap {
        sessionId in
        // Получаем информацию о клиенте из clients (быстрый O(1) поиск)
        if let client = clients[sessionId] {
            return (sessionId: sessionId, ws: client.ws, el: client.el)
        }
        return nil // Сессия найдена в подписках, но клиент уже отключился (пока мы не удалили)
    }
    
    unlock() // Снимаем блокировку сразу после получения списка целей

    // 6. Асинхронная рассылка (без блокировки)
    for target in targets {
        // Выполняем рассылку в родном EventLoop клиента
        target.el.execute {
            guard !target.ws.isClosed else {
                // Если сокет закрыт, при следующей очистке он будет удален из clients и subscribersByType
                return
            }
            target.ws.send(message, promise: nil)
        }
    }
}
    func send(to sessionId: String, message: String) {
        readLock()
        let target: (sessionId: String, ws: WebSocket, el: any EventLoop)? = {
            if let client = clients[sessionId] {
                return (sessionId: sessionId, ws: client.ws, el: client.el)
            }
            return nil
        }()
        unlock()

        if let target = target {
            target.el.execute {
                // Check if WebSocket is still open before sending
                guard !target.ws.isClosed else {
                    print("[WebSocketManager] Skipping send to closed session \(target.sessionId.prefix(8))...")
                    return
                }

                // Send with promise to catch errors
                target.ws.send(message, promise: nil)
            }
        }
    }

    /// Get the number of active WebSocket connections
    func getActiveConnectionsCount() -> Int {
        readLock()
        defer { unlock() }
        return clients.count
    }

    /// Get the number of unique users with active sessions
    func getUserSessionsCount() -> Int {
        readLock()
        defer { unlock() }
        return userSessions.count
    }
}
