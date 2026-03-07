# Quick Start Guide

## 🚀 Quick Start (3 steps)

### 1. Start Vapor Server

```bash
cd /home/a0e394/testSwift/Hello
./.build/x86_64-unknown-linux-gnu/debug/Hello
```

Server will start on `http://127.0.0.1:3003`

### 2. Install & Run Client

```bash
cd /home/a0e394/testSwift/chat-client

# Install dependencies (first time only)
npm install

# Start development server
npm run dev
```

Client will be available at `http://localhost:3000`

### 3. Test It!

1. Open browser at http://localhost:3000
2. Click "Register" and create account (e.g., username: "alice", password: "test123")
3. You'll be redirected to chat
4. Open another browser/tab, register as different user
5. Chat in real-time! 🎉

## 📱 Testing from Terminal

While server is running, test with curl and wscat:

```bash
# Register user
curl -X POST http://localhost:3003/register \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"test123"}'

# Login and get token
TOKEN=$(curl -s -X POST http://localhost:3003/login \
  -H "Content-Type: application/json" \
  -d '{"username":"bob","password":"test123"}' | jq -r '.token')

# Connect via WebSocket
ENCODED=$(python3 -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$TOKEN")
wscat -c "ws://localhost:3003/chat?token=${ENCODED}"
```

## 🎯 Features to Try

- ✅ Multiple users chatting simultaneously
- ✅ Real-time message delivery
- ✅ Auto-reconnection if connection drops
- ✅ Join/leave notifications
- ✅ Dark mode (based on system preference)
- ✅ Responsive mobile design

## 🐛 Troubleshooting

### Server Not Starting

```bash
# Kill any existing process on port 3003
killall -9 Hello
# Or
sudo fuser -k 3003/tcp
```

### Client Not Connecting

1. Check server is running: `curl http://localhost:3003/health`
2. Check browser console for errors (F12)
3. Clear localStorage: Open console, run `localStorage.clear()`

### WebSocket Issues

- Token must be URL-encoded (client handles this automatically)
- Check network tab in browser DevTools
- Look for WebSocket connection upgrade

## 📂 Project Files

```
chat-client/
├── app/
│   ├── page.tsx           # Login/Register UI
│   ├── chat/page.tsx      # Chat interface
│   ├── layout.tsx         # App layout
│   └── globals.css        # Styles
├── hooks/
│   └── useWebSocket.ts    # WebSocket logic
├── lib/
│   └── api.ts             # API client
├── types/
│   └── api.ts             # TypeScript types
└── package.json
```

## 🔧 Development

### Running in Production Mode

```bash
npm run build
npm start
```

### Changing Server URL

Edit `.env`:

```bash
NEXT_PUBLIC_API_URL=http://your-server:port
```

## 📚 Architecture

```
┌─────────────┐         HTTP/WS         ┌─────────────┐
│             │  ────────────────────▶  │             │
│  Next.js    │         REST API         │   Vapor     │
│  Frontend   │  ◀────────────────────  │   Server    │
│ (React/TS)  │                          │  (Swift)    │
└─────────────┘                          └─────────────┘
      │                                         │
      │                                         │
   Browser                                   SQLite
  LocalStorage                               Database
```

## 🎨 Customization

### Colors

Edit `tailwind.config.js`:

```javascript
theme: {
  extend: {
    colors: {
      primary: '#your-color',
    }
  }
}
```

### Logo/Title

Edit `app/layout.tsx` for page title and `app/page.tsx` for UI text.

## ✅ Success Indicators

You'll know everything works when:

1. Server logs show `Server started on http://127.0.0.1:3003`
2. Client shows green "Connected" indicator
3. Messages appear in real-time
4. No errors in browser console

Enjoy chatting! 💬
