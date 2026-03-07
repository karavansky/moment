# WebSocket Chat Client - Документация / Dokumentation

## 🇷🇺 Русская версия

### Обзор проекта

Это современное real-time приложение для чата, построенное на архитектуре клиент-сервер с использованием WebSocket для мгновенного обмена сообщениями и обновлений статусов пользователей в режиме реального времени.

**Технологический стек:**

- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Swift Vapor 4.x, WebSocket Server
- **База данных:** SQLite
- **Протокол:** WebSocket для real-time коммуникации

### Архитектура приложения

#### Общая структура

```
Frontend (Next.js:3000) ←→ Backend (Vapor:3003) ←→ SQLite Database
         ↓                          ↓
   WebSocket Client         WebSocket Server
         ↓                          ↓
   Context Provider      Subscription Manager
         ↓                          ↓
   React Components      Message Broadcaster
```

#### Ключевые особенности

1. **Единое WebSocket соединение** - глобальный контекст предотвращает дублирование подключений
2. **Система подписок** - клиенты подписываются на определенные типы сообщений (`cpu_status`, `user_status`, `all_messages`)
3. **Real-time обновления** - мгновенное отображение новых сообщений без перезагрузки страницы
4. **Мониторинг активности** - отслеживание онлайн-статуса и CPU нагрузки пользователей
5. **Двойная JSON сериализация** - гибкая структура сообщений для поддержки различных схем данных

### Структура файлов

```
chat-client/
├── app/
│   ├── layout.tsx              # Корневой layout с WebSocketProvider
│   ├── page.tsx                # Страница входа/регистрации
│   ├── chat/
│   │   └── page.tsx            # Страница чата (устаревшая)
│   ├── users/
│   │   └── page.tsx            # Список всех пользователей с real-time статусами
│   └── user/
│       └── page.tsx            # Страница сообщений конкретного пользователя
├── contexts/
│   └── WebSocketContext.tsx    # Глобальный контекст WebSocket
├── hooks/
│   └── useWebSocket.ts         # Хук управления WebSocket соединением
├── lib/
│   └── api.ts                  # API клиент для HTTP запросов
└── types/
    └── api.ts                  # TypeScript типы
```

---

## 📁 Подробное описание файлов

### 1. `/app/layout.tsx`

**Назначение:** Корневой компонент приложения, который оборачивает все страницы в WebSocketProvider.

**Ключевые функции:**

- Инициализация глобального WebSocket соединения
- Предоставление dark mode поддержки
- Обеспечение единой точки входа для WebSocket контекста

**Код структура:**

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}
```

**Зависимости:**

- `WebSocketContext.tsx` - глобальный провайдер WebSocket
- `globals.css` - стили приложения

---

### 2. `/app/page.tsx`

**Назначение:** Страница авторизации (вход и регистрация).

**Ключевые функции:**

- Форма входа/регистрации
- Валидация учетных данных
- Сохранение токена в localStorage
- Перенаправление на `/users` после успешной авторизации

**API эндпоинты:**

- `POST /register` - регистрация нового пользователя
- `POST /login` - вход существующего пользователя

**Состояния:**

- `username` - имя пользователя
- `password` - пароль
- `isLogin` - режим входа/регистрации
- `error` - сообщение об ошибке

**Поток данных:**

```
User Input → ApiClient.login/register → Save to localStorage → Trigger auth-change event → Redirect to /users
```

---

### 3. `/app/users/page.tsx`

**Назначение:** Отображение списка всех пользователей с их статусами в реальном времени.

**Ключевые функции:**

- Загрузка списка пользователей через HTTP API
- Подписка на WebSocket события `userStatusChanged` и `cpuStatusChanged`
- Real-time обновление онлайн-статуса и CPU нагрузки
- Навигация к странице конкретного пользователя

**WebSocket подписки:**

- `user_status` - изменения онлайн-статуса
- `cpu_status` - изменения CPU нагрузки

**Компоненты:**

- Список пользователей с индикаторами онлайн/оффлайн
- CPU прогресс-бары
- WebSocket статус индикатор

**Event Listeners:**

```javascript
window.addEventListener("userStatusChanged", (event) => {
  // Обновление isOnline статуса пользователя
});

window.addEventListener("cpuStatusChanged", (event) => {
  // Обновление CPU процента пользователя
});
```

**Используемый контекст:**

- `useWebSocketContext()` - получение глобального WebSocket соединения

---

### 4. `/app/user/page.tsx`

**Назначение:** Детальная страница пользователя с историей сообщений и графиками активности.

**Ключевые функции:**

- Загрузка истории сообщений пользователя
- Real-time добавление новых сообщений через WebSocket
- Графики активности (24 часа, 7 дней, 3 месяца)
- Фильтрация и поиск по сообщениям
- Пагинация сообщений
- Парсинг JSON содержимого сообщений

**WebSocket подписки:**

- `all_messages` - новые сообщения
- `cpu_status` - обновления CPU

**Компоненты:**

```
UserPage
├── ActivityCharts (memo)
│   ├── Last 24 Hours Chart
│   ├── Last 7 Days Chart
│   └── Last 3 Months Chart
├── CpuStatusIndicator (memo)
└── MessagesList
    ├── Filters (Title, Search, Raw)
    ├── Messages List (scrollable)
    └── Pagination Controls
```

**Парсинг сообщений:**

```typescript
const parseContent = (content: string) => {
  // Двойная JSON десериализация:
  // 1. Внешний слой - WebSocket сообщение
  // 2. Внутренний слой - фактическое содержимое
  const parsed = JSON.parse(content);
  return {
    title: parsed.message?.title,
    body: parsed.message?.body,
    isRaw: false,
  };
};
```

**Оптимизации:**

- Мемоизация компонентов (`ActivityCharts`, `CpuStatusIndicator`)
- `useMemo` для фильтрации и пагинации
- Предотвращение дублирования сообщений

**Event Listeners:**

```javascript
window.addEventListener("messageReceived", (event) => {
  const { username: msgUsername, message } = event.detail;
  if (msgUsername === username) {
    setMessages((prev) => [message, ...prev]);
    setCurrentPage(1); // Переход на первую страницу
  }
});
```

---

### 5. `/contexts/WebSocketContext.tsx`

**Назначение:** Глобальный контекст для управления единым WebSocket соединением во всем приложении.

**Ключевые функции:**

- Создание единого WebSocket соединения
- Автоматическое подключение при наличии авторизации
- Реагирование на изменения auth токена
- Подписка на типы сообщений: `cpu_status`, `user_status`, `all_messages`
- Предоставление методов для отправки и управления соединением

**API контекста:**

```typescript
interface WebSocketContextType {
  isConnected: boolean; // Статус соединения
  messages: ChatMessage[]; // История сообщений
  historyLoaded: boolean; // Загружена ли история
  sendMessage: (content: string) => void; // Отправка сообщения
  reconnect: () => Promise<void>; // Переподключение
  subscribe: (messageType: string) => void; // Подписка на тип
  unsubscribe: (messageType: string) => void; // Отписка от типа
}
```

**Жизненный цикл:**

```
Component Mount
  ↓
Load token from localStorage
  ↓
Create WebSocket with subscriptions
  ↓
Listen to auth-change events
  ↓
Auto reconnect on auth updates
  ↓
Component Unmount → Cleanup
```

**Обработка событий:**

- `storage` - изменения в другой вкладке
- `auth-change` - изменения в текущей вкладке
- Автоматическое пересоздание соединения при смене токена

---

### 6. `/hooks/useWebSocket.ts`

**Назначение:** Пользовательский хук для управления WebSocket соединением с поддержкой подписок.

**Параметры:**

```typescript
interface UseWebSocketOptions {
  token: string; // JWT токен
  username: string; // Имя пользователя
  onConnectionChange?: (connected: boolean) => void;
  subscribeToTypes?: string[]; // Типы подписок
}
```

**Возвращаемые значения:**

```typescript
{
  messages: ChatMessage[];       // Локальная история
  connected: boolean;            // Статус соединения
  historyLoaded: boolean;        // Статус загрузки
  sendMessage: (content: string) => void;
  reconnect: () => Promise<void>;
  subscribe: (messageType: string) => void;
  unsubscribe: (messageType: string) => void;
}
```

**Обработка сообщений:**

```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // Dispatch CustomEvents для различных типов
  if (data.type === "cpu_status") {
    window.dispatchEvent(
      new CustomEvent("cpuStatusChanged", {
        detail: { username: data.username, status: data.status },
      })
    );
  }

  if (data.type === "user_status") {
    window.dispatchEvent(
      new CustomEvent("userStatusChanged", {
        detail: { username: data.username, isOnline: data.isOnline },
      })
    );
  }

  if (data.type === "message") {
    const parsed = JSON.parse(data.content);
    window.dispatchEvent(
      new CustomEvent("messageReceived", {
        detail: { username: parsed.username, message: data },
      })
    );
  }
};
```

**Система подписок:**

```typescript
const subscribe = (messageType: string) => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      messageType: messageType,
    })
  );
};
```

**Автопереподключение:**

- Экспоненциальная задержка (1s → 2s → 4s → 8s → max 30s)
- Проверка состояния перед подключением (избегание CONNECTING)
- Очистка таймаутов при размонтировании

---

### 7. `/lib/api.ts`

**Назначение:** HTTP API клиент для взаимодействия с Vapor backend.

**Конфигурация URL:**

```typescript
const API_BASE_URL = (() => {
  // Server-side: /api прокси в dev, NEXT_PUBLIC_API_URL в prod
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development" ? "/api" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
  }

  // Client-side: всегда /api (избегаем CORS)
  return process.env.NEXT_PUBLIC_API_URL || "/api";
})();
```

**API методы:**

| Метод                                   | Эндпоинт                                       | Описание                        |
| --------------------------------------- | ---------------------------------------------- | ------------------------------- |
| `register(username, password)`          | `POST /register`                               | Регистрация нового пользователя |
| `login(username, password)`             | `POST /login`                                  | Вход существующего пользователя |
| `getMessageHistory(token)`              | `GET /messages`                                | История сообщений (отключено)   |
| `getUsersList(token)`                   | `GET /users`                                   | Список всех пользователей       |
| `getUserMessages(token, username)`      | `GET /user?username={username}`                | Сообщения пользователя          |
| `getUserStatusHistory(token, username)` | `GET /user/status-history?username={username}` | История статусов                |
| `getWebSocketURL(token)`                | -                                              | Генерация WebSocket URL         |

**WebSocket URL:**

```typescript
// Прямое подключение к backend (Next.js не может проксировать WS)
const backendUrl = `ws://${window.location.hostname}:3003`;
const wsUrl = `${backendUrl}/chat?token=${encodedToken}`;
```

**Обработка ошибок:**

- Проверка HTTP статуса
- Парсинг текста ошибки
- Выброс исключений с описанием

---

### 8. `/types/api.ts`

**Назначение:** TypeScript определения типов для API.

**Основные типы:**

```typescript
export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  status: number; // CPU процент
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string; // JSON строка с вложенной структурой
  createdAt: string;
}

export interface WSMessage {
  type: string; // "message" | "cpu_status" | "user_status"
  username?: string;
  content?: string;
  status?: number;
  isOnline?: boolean;
}
```

---

## 🔄 Потоки данных

### 1. Авторизация

```
User → Login Form → ApiClient.login() → Backend
                                          ↓
                                    JWT Token
                                          ↓
localStorage.setItem("token") → dispatch("auth-change")
                                          ↓
                              WebSocketContext reacts
                                          ↓
                              Create new WebSocket
                                          ↓
                              Auto-subscribe to types
```

### 2. Real-time обновления сообщений

```
Backend receives message
  ↓
broadcastToSubscribers("all_messages")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Parse JSON.parse(data.content)
  ↓
Dispatch CustomEvent("messageReceived")
  ↓
Component EventListener → setState
  ↓
React re-render → New message appears
```

### 3. Обновление статуса пользователя

```
Backend: user.isOnline = true
  ↓
broadcastToSubscribers("user_status")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Dispatch CustomEvent("userStatusChanged")
  ↓
/users page listener → updateUsers
  ↓
React re-render → Green indicator
```

### 4. CPU статус

```
Backend receives CPU message
  ↓
user.status = cpuValue
broadcastToSubscribers("cpu_status")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Dispatch CustomEvent("cpuStatusChanged")
  ↓
Component listeners update local state
  ↓
Progress bars update in real-time
```

---

## 🎯 Система подписок

**Типы подписок:**

1. `cpu_status` - обновления CPU нагрузки
2. `user_status` - изменения онлайн-статуса
3. `all_messages` - все новые сообщения

**Механизм:**

```typescript
// Подписка на backend
ws.send(
  JSON.stringify({
    type: "subscribe",
    messageType: "cpu_status",
  })
);

// Backend фильтрует и отправляет только релевантные сообщения
if (subscriptions.contains("cpu_status")) {
  ws.send(cpuStatusMessage);
}
```

**Глобальная подписка в WebSocketContext:**

```typescript
subscribeToTypes: ["cpu_status", "user_status", "all_messages"];
```

---

## 🔧 Настройка и запуск

### Требования

- Node.js 18+
- npm или yarn
- Swift 5.x (для backend)
- SQLite

### Установка

1. **Клонирование репозитория:**

```bash
cd /home/a0e394/testSwift/chat-client
```

2. **Установка зависимостей:**

```bash
npm install
```

3. **Запуск backend (Swift Vapor):**

```bash
cd /home/a0e394/testSwift/Hello
swift run
# Backend будет доступен на http://localhost:3003
```

4. **Запуск frontend:**

```bash
cd /home/a0e394/testSwift/chat-client
npm run dev
# Frontend будет доступен на http://localhost:3000
```

### Переменные окружения

Создайте `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003  # Опционально, по умолчанию /api
```

---

## 🐛 Отладка

### Включение debug логов

В `useWebSocket.ts` найдите и раскомментируйте:

```typescript
// console.log("[WS] Connection opened");
// console.log("[WS] Received message:", data);
```

В `WebSocketContext.tsx`:

```typescript
// console.log("[WSContext] Auth changed, updating...");
```

В компонентах страниц:

```typescript
// console.log("[UserPage] Received messageReceived event:", event.detail);
```

### Проверка WebSocket соединения

1. Откройте DevTools → Network → WS
2. Должно быть **ОДНО** WebSocket соединение к `ws://localhost:3003/chat?token=...`
3. Проверьте сообщения: должны видеть `subscribe`, `cpu_status`, `user_status`, `message`

### Проверка CustomEvents

В консоли браузера:

```javascript
window.addEventListener("messageReceived", (e) => console.log("New message:", e.detail));
window.addEventListener("cpuStatusChanged", (e) => console.log("CPU update:", e.detail));
window.addEventListener("userStatusChanged", (e) => console.log("Status update:", e.detail));
```

---

## 📊 Структура сообщений

### Двойная JSON сериализация

**Почему?** Гибкая архитектура для поддержки различных схем сообщений.

**Пример:**

```json
{
  "type": "message",
  "content": "{\"type\":\"log\",\"username\":\"star\",\"message\":{\"title\":\"console.log\",\"body\":[\"Test message\"]}}"
}
```

**Слои:**

1. **Внешний (WebSocket wrapper):**

   - `type` - тип WebSocket сообщения
   - `content` - JSON строка с фактическим содержимым

2. **Внутренний (фактическое сообщение):**
   - `type` - тип лога ("log", "cpu", etc.)
   - `username` - отправитель
   - `message` - объект с `title` и `body`

**Парсинг:**

```typescript
// Первый уровень
const wsMessage = JSON.parse(event.data);

// Второй уровень
const actualMessage = JSON.parse(wsMessage.content);

// Извлечение данных
const title = actualMessage.message?.title;
const body = actualMessage.message?.body;
```

---

## 🚀 Оптимизации

### 1. Мемоизация компонентов

```typescript
const ActivityCharts = memo(({ activityData }) => { ... });
const CpuStatusIndicator = memo(({ cpuStatus }) => { ... });
```

### 2. useMemo для вычислений

```typescript
const filteredMessages = useMemo(() => {
  return messages.filter((msg) => msg.content.includes(searchText));
}, [messages, searchText]);
```

### 3. Единое WebSocket соединение

- Используется WebSocketContext вместо множественных подключений
- Предотвращает дублирование через глобальный провайдер

### 4. Event-driven архитектура

- CustomEvents вместо prop drilling
- Decoupled components для лучшей масштабируемости

---

## 📝 Best Practices

1. **Всегда используйте `useWebSocketContext()`** вместо прямого вызова `useWebSocket()`
2. **Очищайте EventListeners** в `useEffect` cleanup функциях
3. **Проверяйте дубликаты сообщений** перед добавлением в state
4. **Используйте мемоизацию** для тяжелых вычислений
5. **Логируйте важные события** для упрощения отладки
6. **Обрабатывайте переподключения** gracefully с экспоненциальной задержкой
7. **Защищайтесь от дублирования событий в React Strict Mode** - используйте timestamp-based деduplication

### ⚠️ React Strict Mode и дублирование событий

**Проблема:** В режиме разработки React 19 Strict Mode монтирует компоненты дважды для выявления побочных эффектов. Это может привести к дублированию обработки CustomEvents.

**Симптомы:**

```javascript
// Одно событие обрабатывается дважды
[UsersPage] CPU status changed: star → 5
[UsersPage] Updated users after CPU change: (4) [{…}, {…}, {…}, {…}]
[UsersPage] Updated users after CPU change: (4) [{…}, {…}, {…}, {…}]  // ДУБЛИКАТ!
```

**Решение:** Используйте timestamp-based деduplication с `useRef`:

```typescript
const lastEventTimestamps = useRef<{ [key: string]: number }>({});

const handleCpuStatusChanged = (event: any) => {
  const { username, status } = event.detail;
  const eventKey = `cpu_${username}_${status}`;
  const now = Date.now();

  // Предотвращение дублирования в течение 100мс
  if (lastEventTimestamps.current[eventKey] && now - lastEventTimestamps.current[eventKey] < 100) {
    return; // Пропускаем дубликат
  }
  lastEventTimestamps.current[eventKey] = now;

  // Обработка события...
};
```

**Почему это работает:**

- React Strict Mode монтирует компонент дважды почти одновременно
- События в пределах 100мс считаются дубликатами
- В продакшене Strict Mode отключен, защита не влияет на производительность

---

## 🔐 Безопасность

- JWT токены для аутентификации
- Bearer token в WebSocket URL
- HTTPS/WSS в продакшене (рекомендуется)
- Валидация токенов на backend

---

## 📈 Производительность

- Lazy loading компонентов
- Виртуализация для больших списков (рекомендуется добавить)
- Пагинация сообщений
- Мемоизация расчетов
- Debouncing для поиска (можно добавить)

---

---

# 🇩🇪 Deutsche Version

### Projektübersicht

Dies ist eine moderne Real-time-Chat-Anwendung, die auf einer Client-Server-Architektur mit WebSocket für sofortige Nachrichtenübermittlung und Echtzeit-Statusaktualisierungen aufbaut.

**Technologie-Stack:**

- **Frontend:** Next.js 14 (App Router), React 19, TypeScript, Tailwind CSS
- **Backend:** Swift Vapor 4.x, WebSocket Server
- **Datenbank:** SQLite
- **Protokoll:** WebSocket für Real-time-Kommunikation

### Anwendungsarchitektur

#### Gesamtstruktur

```
Frontend (Next.js:3000) ←→ Backend (Vapor:3003) ←→ SQLite Datenbank
         ↓                          ↓
   WebSocket Client         WebSocket Server
         ↓                          ↓
   Context Provider      Subscription Manager
         ↓                          ↓
   React Components      Message Broadcaster
```

#### Hauptmerkmale

1. **Einzelne WebSocket-Verbindung** - globaler Kontext verhindert doppelte Verbindungen
2. **Abonnementsystem** - Clients abonnieren bestimmte Nachrichtentypen (`cpu_status`, `user_status`, `all_messages`)
3. **Echtzeit-Updates** - sofortige Anzeige neuer Nachrichten ohne Seitenaktualisierung
4. **Aktivitätsüberwachung** - Verfolgung von Online-Status und CPU-Auslastung der Benutzer
5. **Doppelte JSON-Serialisierung** - flexible Nachrichtenstruktur zur Unterstützung verschiedener Datenschemas

### Dateistruktur

```
chat-client/
├── app/
│   ├── layout.tsx              # Root-Layout mit WebSocketProvider
│   ├── page.tsx                # Login/Registrierungsseite
│   ├── chat/
│   │   └── page.tsx            # Chat-Seite (veraltet)
│   ├── users/
│   │   └── page.tsx            # Liste aller Benutzer mit Echtzeit-Status
│   └── user/
│       └── page.tsx            # Nachrichtenseite eines bestimmten Benutzers
├── contexts/
│   └── WebSocketContext.tsx    # Globaler WebSocket-Kontext
├── hooks/
│   └── useWebSocket.ts         # Hook zur WebSocket-Verbindungsverwaltung
├── lib/
│   └── api.ts                  # API-Client für HTTP-Anfragen
└── types/
    └── api.ts                  # TypeScript-Typen
```

---

## 📁 Detaillierte Dateibeschreibung

### 1. `/app/layout.tsx`

**Zweck:** Root-Komponente der Anwendung, die alle Seiten mit WebSocketProvider umhüllt.

**Hauptfunktionen:**

- Initialisierung der globalen WebSocket-Verbindung
- Bereitstellung von Dark-Mode-Unterstützung
- Gewährleistung eines einheitlichen Einstiegspunkts für den WebSocket-Kontext

**Code-Struktur:**

```tsx
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <WebSocketProvider>{children}</WebSocketProvider>
      </body>
    </html>
  );
}
```

**Abhängigkeiten:**

- `WebSocketContext.tsx` - globaler WebSocket-Provider
- `globals.css` - Anwendungsstile

---

### 2. `/app/page.tsx`

**Zweck:** Autorisierungsseite (Login und Registrierung).

**Hauptfunktionen:**

- Login/Registrierungsformular
- Validierung der Anmeldedaten
- Speichern des Tokens in localStorage
- Weiterleitung zu `/users` nach erfolgreicher Autorisierung

**API-Endpunkte:**

- `POST /register` - Registrierung eines neuen Benutzers
- `POST /login` - Anmeldung eines bestehenden Benutzers

**Zustände:**

- `username` - Benutzername
- `password` - Passwort
- `isLogin` - Login/Registrierungsmodus
- `error` - Fehlermeldung

**Datenfluss:**

```
Benutzereingabe → ApiClient.login/register → In localStorage speichern → auth-change Event auslösen → Weiterleitung zu /users
```

---

### 3. `/app/users/page.tsx`

**Zweck:** Anzeige einer Liste aller Benutzer mit ihren Echtzeitstatus.

**Hauptfunktionen:**

- Laden der Benutzerliste über HTTP API
- Abonnement von WebSocket-Events `userStatusChanged` und `cpuStatusChanged`
- Echtzeit-Aktualisierung von Online-Status und CPU-Auslastung
- Navigation zur Seite eines bestimmten Benutzers

**WebSocket-Abonnements:**

- `user_status` - Änderungen des Online-Status
- `cpu_status` - Änderungen der CPU-Auslastung

**Komponenten:**

- Benutzerliste mit Online/Offline-Indikatoren
- CPU-Fortschrittsbalken
- WebSocket-Statusindikator

**Event-Listener:**

```javascript
window.addEventListener("userStatusChanged", (event) => {
  // Aktualisierung des isOnline-Status des Benutzers
});

window.addEventListener("cpuStatusChanged", (event) => {
  // Aktualisierung des CPU-Prozentsatzes des Benutzers
});
```

**Verwendeter Kontext:**

- `useWebSocketContext()` - Abrufen der globalen WebSocket-Verbindung

---

### 4. `/app/user/page.tsx`

**Zweck:** Detailseite des Benutzers mit Nachrichtenverlauf und Aktivitätsdiagrammen.

**Hauptfunktionen:**

- Laden des Nachrichtenverlaufs des Benutzers
- Echtzeit-Hinzufügen neuer Nachrichten über WebSocket
- Aktivitätsdiagramme (24 Stunden, 7 Tage, 3 Monate)
- Filterung und Suche in Nachrichten
- Nachrichtenpaginierung
- Parsen von JSON-Nachrichteninhalten

**WebSocket-Abonnements:**

- `all_messages` - neue Nachrichten
- `cpu_status` - CPU-Updates

**Komponenten:**

```
UserPage
├── ActivityCharts (memo)
│   ├── Letzte 24 Stunden Diagramm
│   ├── Letzte 7 Tage Diagramm
│   └── Letzte 3 Monate Diagramm
├── CpuStatusIndicator (memo)
└── MessagesList
    ├── Filter (Titel, Suche, Raw)
    ├── Nachrichtenliste (scrollbar)
    └── Paginierungssteuerung
```

**Nachrichtenparsen:**

```typescript
const parseContent = (content: string) => {
  // Doppelte JSON-Deserialisierung:
  // 1. Äußere Schicht - WebSocket-Nachricht
  // 2. Innere Schicht - tatsächlicher Inhalt
  const parsed = JSON.parse(content);
  return {
    title: parsed.message?.title,
    body: parsed.message?.body,
    isRaw: false,
  };
};
```

**Optimierungen:**

- Memoization von Komponenten (`ActivityCharts`, `CpuStatusIndicator`)
- `useMemo` für Filterung und Paginierung
- Vermeidung von Nachrichtenduplikaten

**Event-Listener:**

```javascript
window.addEventListener("messageReceived", (event) => {
  const { username: msgUsername, message } = event.detail;
  if (msgUsername === username) {
    setMessages((prev) => [message, ...prev]);
    setCurrentPage(1); // Zur ersten Seite wechseln
  }
});
```

---

### 5. `/contexts/WebSocketContext.tsx`

**Zweck:** Globaler Kontext zur Verwaltung einer einzigen WebSocket-Verbindung in der gesamten Anwendung.

**Hauptfunktionen:**

- Erstellung einer einzigen WebSocket-Verbindung
- Automatische Verbindung bei vorhandener Autorisierung
- Reaktion auf Änderungen des Auth-Tokens
- Abonnement von Nachrichtentypen: `cpu_status`, `user_status`, `all_messages`
- Bereitstellung von Methoden zum Senden und Verwalten der Verbindung

**Kontext-API:**

```typescript
interface WebSocketContextType {
  isConnected: boolean; // Verbindungsstatus
  messages: ChatMessage[]; // Nachrichtenverlauf
  historyLoaded: boolean; // Ist der Verlauf geladen
  sendMessage: (content: string) => void; // Nachricht senden
  reconnect: () => Promise<void>; // Wiederverbindung
  subscribe: (messageType: string) => void; // Typ abonnieren
  unsubscribe: (messageType: string) => void; // Typ abbestellen
}
```

**Lebenszyklus:**

```
Component Mount
  ↓
Token aus localStorage laden
  ↓
WebSocket mit Abonnements erstellen
  ↓
Auf auth-change Events hören
  ↓
Automatische Wiederverbindung bei Auth-Updates
  ↓
Component Unmount → Aufräumen
```

**Event-Behandlung:**

- `storage` - Änderungen in einem anderen Tab
- `auth-change` - Änderungen im aktuellen Tab
- Automatische Neuerstellung der Verbindung bei Token-Wechsel

---

### 6. `/hooks/useWebSocket.ts`

**Zweck:** Benutzerdefinierter Hook zur Verwaltung der WebSocket-Verbindung mit Abonnement-Unterstützung.

**Parameter:**

```typescript
interface UseWebSocketOptions {
  token: string; // JWT-Token
  username: string; // Benutzername
  onConnectionChange?: (connected: boolean) => void;
  subscribeToTypes?: string[]; // Abonnementtypen
}
```

**Rückgabewerte:**

```typescript
{
  messages: ChatMessage[];       // Lokaler Verlauf
  connected: boolean;            // Verbindungsstatus
  historyLoaded: boolean;        // Ladestatus
  sendMessage: (content: string) => void;
  reconnect: () => Promise<void>;
  subscribe: (messageType: string) => void;
  unsubscribe: (messageType: string) => void;
}
```

**Nachrichtenbehandlung:**

```typescript
ws.onmessage = (event) => {
  const data = JSON.parse(event.data);

  // CustomEvents für verschiedene Typen dispatchen
  if (data.type === "cpu_status") {
    window.dispatchEvent(
      new CustomEvent("cpuStatusChanged", {
        detail: { username: data.username, status: data.status },
      })
    );
  }

  if (data.type === "user_status") {
    window.dispatchEvent(
      new CustomEvent("userStatusChanged", {
        detail: { username: data.username, isOnline: data.isOnline },
      })
    );
  }

  if (data.type === "message") {
    const parsed = JSON.parse(data.content);
    window.dispatchEvent(
      new CustomEvent("messageReceived", {
        detail: { username: parsed.username, message: data },
      })
    );
  }
};
```

**Abonnementsystem:**

```typescript
const subscribe = (messageType: string) => {
  ws.send(
    JSON.stringify({
      type: "subscribe",
      messageType: messageType,
    })
  );
};
```

**Auto-Wiederverbindung:**

- Exponentielle Verzögerung (1s → 2s → 4s → 8s → max 30s)
- Zustandsprüfung vor Verbindung (CONNECTING vermeiden)
- Timeout-Bereinigung beim Unmounting

---

### 7. `/lib/api.ts`

**Zweck:** HTTP-API-Client für die Interaktion mit dem Vapor-Backend.

**URL-Konfiguration:**

```typescript
const API_BASE_URL = (() => {
  // Server-side: /api Proxy in dev, NEXT_PUBLIC_API_URL in prod
  if (typeof window === "undefined") {
    return process.env.NODE_ENV === "development" ? "/api" : process.env.NEXT_PUBLIC_API_URL || "http://localhost:3003";
  }

  // Client-side: immer /api (CORS vermeiden)
  return process.env.NEXT_PUBLIC_API_URL || "/api";
})();
```

**API-Methoden:**

| Methode                                 | Endpunkt                                       | Beschreibung                          |
| --------------------------------------- | ---------------------------------------------- | ------------------------------------- |
| `register(username, password)`          | `POST /register`                               | Registrierung eines neuen Benutzers   |
| `login(username, password)`             | `POST /login`                                  | Anmeldung eines bestehenden Benutzers |
| `getMessageHistory(token)`              | `GET /messages`                                | Nachrichtenverlauf (deaktiviert)      |
| `getUsersList(token)`                   | `GET /users`                                   | Liste aller Benutzer                  |
| `getUserMessages(token, username)`      | `GET /user?username={username}`                | Benutzernachrichten                   |
| `getUserStatusHistory(token, username)` | `GET /user/status-history?username={username}` | Statusverlauf                         |
| `getWebSocketURL(token)`                | -                                              | WebSocket-URL-Generierung             |

**WebSocket-URL:**

```typescript
// Direkte Verbindung zum Backend (Next.js kann WS nicht proxyen)
const backendUrl = `ws://${window.location.hostname}:3003`;
const wsUrl = `${backendUrl}/chat?token=${encodedToken}`;
```

**Fehlerbehandlung:**

- HTTP-Statusprüfung
- Parsen von Fehlertexten
- Auswerfen von Ausnahmen mit Beschreibung

---

### 8. `/types/api.ts`

**Zweck:** TypeScript-Typdefinitionen für die API.

**Haupttypen:**

```typescript
export interface User {
  id: string;
  username: string;
  isOnline: boolean;
  status: number; // CPU-Prozentsatz
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  username: string;
  content: string; // JSON-String mit verschachtelter Struktur
  createdAt: string;
}

export interface WSMessage {
  type: string; // "message" | "cpu_status" | "user_status"
  username?: string;
  content?: string;
  status?: number;
  isOnline?: boolean;
}
```

---

## 🔄 Datenflüsse

### 1. Autorisierung

```
Benutzer → Login-Formular → ApiClient.login() → Backend
                                          ↓
                                    JWT-Token
                                          ↓
localStorage.setItem("token") → dispatch("auth-change")
                                          ↓
                              WebSocketContext reagiert
                                          ↓
                              Neue WebSocket erstellen
                                          ↓
                              Auto-Abonnement von Typen
```

### 2. Echtzeit-Nachrichtenaktualisierungen

```
Backend empfängt Nachricht
  ↓
broadcastToSubscribers("all_messages")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Parse JSON.parse(data.content)
  ↓
Dispatch CustomEvent("messageReceived")
  ↓
Component EventListener → setState
  ↓
React re-render → Neue Nachricht erscheint
```

### 3. Benutzerstatus-Aktualisierung

```
Backend: user.isOnline = true
  ↓
broadcastToSubscribers("user_status")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Dispatch CustomEvent("userStatusChanged")
  ↓
/users Seiten-Listener → updateUsers
  ↓
React re-render → Grüner Indikator
```

### 4. CPU-Status

```
Backend empfängt CPU-Nachricht
  ↓
user.status = cpuValue
broadcastToSubscribers("cpu_status")
  ↓
WebSocket → useWebSocket.onmessage
  ↓
Dispatch CustomEvent("cpuStatusChanged")
  ↓
Component-Listener aktualisieren lokalen Zustand
  ↓
Fortschrittsbalken aktualisieren sich in Echtzeit
```

---

## 🎯 Abonnementsystem

**Abonnementtypen:**

1. `cpu_status` - CPU-Auslastungsupdates
2. `user_status` - Änderungen des Online-Status
3. `all_messages` - alle neuen Nachrichten

**Mechanismus:**

```typescript
// Abonnement auf Backend
ws.send(
  JSON.stringify({
    type: "subscribe",
    messageType: "cpu_status",
  })
);

// Backend filtert und sendet nur relevante Nachrichten
if (subscriptions.contains("cpu_status")) {
  ws.send(cpuStatusMessage);
}
```

**Globales Abonnement in WebSocketContext:**

```typescript
subscribeToTypes: ["cpu_status", "user_status", "all_messages"];
```

---

## 🔧 Einrichtung und Start

### Anforderungen

- Node.js 18+
- npm oder yarn
- Swift 5.x (für Backend)
- SQLite

### Installation

1. **Repository klonen:**

```bash
cd /home/a0e394/testSwift/chat-client
```

2. **Abhängigkeiten installieren:**

```bash
npm install
```

3. **Backend starten (Swift Vapor):**

```bash
cd /home/a0e394/testSwift/Hello
swift run
# Backend ist verfügbar auf http://localhost:3003
```

4. **Frontend starten:**

```bash
cd /home/a0e394/testSwift/chat-client
npm run dev
# Frontend ist verfügbar auf http://localhost:3000
```

### Umgebungsvariablen

`.env.local` erstellen:

```env
NEXT_PUBLIC_API_URL=http://localhost:3003  # Optional, Standard /api
```

---

## 🐛 Fehlersuche

### Debug-Logs aktivieren

In `useWebSocket.ts` finden und auskommentieren:

```typescript
// console.log("[WS] Connection opened");
// console.log("[WS] Received message:", data);
```

In `WebSocketContext.tsx`:

```typescript
// console.log("[WSContext] Auth changed, updating...");
```

In Seitenkomponenten:

```typescript
// console.log("[UserPage] Received messageReceived event:", event.detail);
```

### WebSocket-Verbindung prüfen

1. DevTools öffnen → Network → WS
2. Es sollte **EINE** WebSocket-Verbindung zu `ws://localhost:3003/chat?token=...` geben
3. Nachrichten prüfen: sollten `subscribe`, `cpu_status`, `user_status`, `message` sehen

### CustomEvents prüfen

In der Browser-Konsole:

```javascript
window.addEventListener("messageReceived", (e) => console.log("Neue Nachricht:", e.detail));
window.addEventListener("cpuStatusChanged", (e) => console.log("CPU-Update:", e.detail));
window.addEventListener("userStatusChanged", (e) => console.log("Status-Update:", e.detail));
```

---

## 📊 Nachrichtenstruktur

### Doppelte JSON-Serialisierung

**Warum?** Flexible Architektur zur Unterstützung verschiedener Nachrichtenschemas.

**Beispiel:**

```json
{
  "type": "message",
  "content": "{\"type\":\"log\",\"username\":\"star\",\"message\":{\"title\":\"console.log\",\"body\":[\"Test-Nachricht\"]}}"
}
```

**Schichten:**

1. **Äußere (WebSocket-Wrapper):**

   - `type` - WebSocket-Nachrichtentyp
   - `content` - JSON-String mit tatsächlichem Inhalt

2. **Innere (tatsächliche Nachricht):**
   - `type` - Log-Typ ("log", "cpu", etc.)
   - `username` - Absender
   - `message` - Objekt mit `title` und `body`

**Parsen:**

```typescript
// Erste Ebene
const wsMessage = JSON.parse(event.data);

// Zweite Ebene
const actualMessage = JSON.parse(wsMessage.content);

// Daten extrahieren
const title = actualMessage.message?.title;
const body = actualMessage.message?.body;
```

---

## 🚀 Optimierungen

### 1. Komponenten-Memoization

```typescript
const ActivityCharts = memo(({ activityData }) => { ... });
const CpuStatusIndicator = memo(({ cpuStatus }) => { ... });
```

### 2. useMemo für Berechnungen

```typescript
const filteredMessages = useMemo(() => {
  return messages.filter((msg) => msg.content.includes(searchText));
}, [messages, searchText]);
```

### 3. Einzelne WebSocket-Verbindung

- Verwendet WebSocketContext anstelle mehrerer Verbindungen
- Verhindert Duplikate durch globalen Provider

### 4. Event-getriebene Architektur

- CustomEvents anstelle von Prop Drilling
- Entkoppelte Komponenten für bessere Skalierbarkeit

---

## 📝 Best Practices

1. **Verwenden Sie immer `useWebSocketContext()`** anstelle des direkten Aufrufs von `useWebSocket()`
2. **Bereinigen Sie EventListeners** in `useEffect`-Cleanup-Funktionen
3. **Prüfen Sie auf Nachrichtenduplikate** vor dem Hinzufügen zum State
4. **Verwenden Sie Memoization** für schwere Berechnungen
5. **Loggen Sie wichtige Ereignisse** zur Vereinfachung der Fehlersuche
6. **Behandeln Sie Wiederverbindungen** gracefully mit exponentieller Verzögerung
7. **Schützen Sie sich vor Event-Duplikaten im React Strict Mode** - verwenden Sie timestamp-basierte Deduplizierung

### ⚠️ React Strict Mode und Event-Duplikate

**Problem:** Im Entwicklungsmodus mountet React 19 Strict Mode Komponenten zweimal, um Nebeneffekte zu erkennen. Dies kann zur doppelten Verarbeitung von CustomEvents führen.

**Symptome:**

```javascript
// Ein Event wird zweimal verarbeitet
[UsersPage] CPU status changed: star → 5
[UsersPage] Updated users after CPU change: (4) [{…}, {…}, {…}, {…}]
[UsersPage] Updated users after CPU change: (4) [{…}, {…}, {…}, {…}]  // DUPLIKAT!
```

**Lösung:** Verwenden Sie timestamp-basierte Deduplizierung mit `useRef`:

```typescript
const lastEventTimestamps = useRef<{ [key: string]: number }>({});

const handleCpuStatusChanged = (event: any) => {
  const { username, status } = event.detail;
  const eventKey = `cpu_${username}_${status}`;
  const now = Date.now();

  // Duplikate innerhalb 100ms verhindern
  if (lastEventTimestamps.current[eventKey] && now - lastEventTimestamps.current[eventKey] < 100) {
    return; // Duplikat überspringen
  }
  lastEventTimestamps.current[eventKey] = now;

  // Event verarbeiten...
};
```

**Warum funktioniert das:**

- React Strict Mode mountet die Komponente fast gleichzeitig zweimal
- Events innerhalb von 100ms werden als Duplikate betrachtet
- In Produktion ist Strict Mode deaktiviert, der Schutz beeinträchtigt die Leistung nicht

---

## 🔐 Sicherheit

- JWT-Tokens für Authentifizierung
- Bearer-Token in WebSocket-URL
- HTTPS/WSS in Produktion (empfohlen)
- Token-Validierung auf Backend

---

## 📈 Leistung

- Lazy Loading von Komponenten
- Virtualisierung für große Listen (empfohlen hinzuzufügen)
- Nachrichtenpaginierung
- Memoization von Berechnungen
- Debouncing für Suche (kann hinzugefügt werden)

---

## 📞 Support

Bei Fragen oder Problemen:

- Überprüfen Sie die Debug-Logs
- Testen Sie die WebSocket-Verbindung
- Validieren Sie die Auth-Tokens
- Überprüfen Sie die Backend-Logs

---

**Letzte Aktualisierung:** 11. November 2025  
**Version:** 1.0.0  
**Lizenz:** Proprietär
