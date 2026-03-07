# Vapor WebSocket Chat Server - API Documentation

## Base URL
```
http://localhost:3003
```

## Endpoints

### 🏥 Health Check
```bash
GET /health
```
**Response:**
```json
{"status": "ok"}
```

### 👤 Register User
```bash
POST /register
Content-Type: application/json

{
  "username": "john",
  "password": "secret123"
}
```
**Response:**
```json
{
  "token": "base64-encoded-token",
  "username": "john"
}
```

### 🔐 Login
```bash
POST /login
Content-Type: application/json

{
  "username": "john",
  "password": "secret123"
}
```
**Response:**
```json
{
  "token": "base64-encoded-token",
  "username": "john"
}
```

### 👥 Get All Users
```bash
GET /users
```
**Response:**
```json
[
  {"username": "alice"},
  {"username": "bob"},
  {"username": "john"}
]
```

### 💬 Get Messages (requires auth)
```bash
GET /messages
Authorization: Bearer {token}
```
**Response:**
```json
[
  {
    "id": "uuid",
    "username": "alice",
    "content": "Hello!",
    "createdAt": "2025-10-20T12:00:00Z"
  }
]
```

### 🔌 WebSocket Chat
```bash
ws://localhost:3003/chat?token={url-encoded-token}
```

**Message Format (received):**
```json
{
  "type": "system|message|join|leave",
  "content": "message text",
  "username": "alice",
  "timestamp": 1729425600.123
}
```

**Send Message:**
Send plain text, it will be broadcast to all connected clients.

## Examples

### Complete Flow

```bash
# 1. Register
curl -X POST http://localhost:3003/register \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"pass123"}'

# 2. Login and save token
TOKEN=$(curl -s -X POST http://localhost:3003/login \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"pass123"}' | jq -r '.token')

# 3. Get all users
curl -s http://localhost:3003/users | jq .

# 4. Get messages (with auth)
curl -s http://localhost:3003/messages \
  -H "Authorization: Bearer $TOKEN" | jq .

# 5. Connect via WebSocket
ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$TOKEN")
wscat -c "ws://localhost:3003/chat?token=${ENCODED}"
```

## Error Responses

### 401 Unauthorized
```json
{
  "error": true,
  "reason": "Unauthorized"
}
```

### 409 Conflict
```json
{
  "error": true,
  "reason": "Username already exists"
}
```

### 400 Bad Request
```json
{
  "error": true,
  "reason": "Invalid credentials"
}
```

## Notes

- Tokens must be URL-encoded for WebSocket connections (especially `+` → `%2B`)
- Messages endpoint returns last 50 messages in descending order
- WebSocket automatically reconnects on disconnect (client-side)
- All timestamps are in ISO 8601 format or Unix timestamps

