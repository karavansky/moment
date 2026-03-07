# Vapor Chat Client

Modern Next.js chat client for the Vapor WebSocket server.

## Features

- ✅ Real-time WebSocket messaging
- ✅ User authentication (register/login)
- ✅ Auto-reconnection with exponential backoff
- ✅ Dark mode support
- ✅ Responsive design
- ✅ TypeScript + Tailwind CSS
- ✅ Token-based authentication

## Prerequisites

- Node.js 18+ and npm/yarn/pnpm
- Running Vapor server at `localhost:3003`

## Installation

```bash
cd /home/a0e394/testSwift/chat-client

# Install dependencies
npm install
# or
yarn install
# or
pnpm install
```

## Configuration

The client connects to `http://localhost:3003` by default. To change this, set the environment variable:

```bash
NEXT_PUBLIC_API_URL=http://your-server:port
```

## Running

### Development Mode

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Production Build

```bash
npm run build
npm start
```

## Usage

1. **Register**: Create a new account with username and password
2. **Login**: Sign in with your credentials
3. **Chat**: Start sending messages in real-time!

## Project Structure

```
chat-client/
├── app/
│   ├── page.tsx          # Login/Register page
│   ├── chat/page.tsx     # Chat interface
│   ├── layout.tsx        # Root layout
│   └── globals.css       # Global styles
├── hooks/
│   └── useWebSocket.ts   # WebSocket hook
├── lib/
│   └── api.ts            # API client
├── types/
│   └── api.ts            # TypeScript types
└── package.json
```

## WebSocket Protocol

The client follows the Vapor server's WebSocket protocol:

### Message Types

- `system`: System messages (e.g., welcome)
- `message`: User chat messages
- `join`: User joined notification
- `leave`: User left notification

### Message Format

```typescript
{
  type: 'system' | 'message' | 'join' | 'leave',
  content: string,
  username?: string,
  timestamp: number  // Unix timestamp
}
```

## API Endpoints

- `POST /register` - Register new user
- `POST /login` - Login user
- `GET /chat?token={encoded_token}` - WebSocket connection

## Token Handling

The client automatically:

- URL-encodes tokens (handles special characters like `+`)
- Stores tokens in localStorage
- Includes tokens in WebSocket URL query parameter

## Troubleshooting

### Connection Failed

1. Ensure Vapor server is running:

   ```bash
   cd /home/a0e394/testSwift/Hello
   ./.build/x86_64-unknown-linux-gnu/debug/Hello
   ```

2. Check server logs for errors

3. Verify server is accessible at `http://localhost:3003/health`

### WebSocket Disconnects

The client automatically attempts to reconnect with exponential backoff (1s, 2s, 4s, 8s, up to 30s).

### Token Issues

If you see authentication errors:

1. Clear localStorage: `localStorage.clear()` in browser console
2. Re-login to get a fresh token

## Development

### Adding Features

- **New routes**: Add files in `app/` directory
- **New components**: Create in `components/` directory
- **API calls**: Extend `lib/api.ts`
- **WebSocket logic**: Modify `hooks/useWebSocket.ts`

### Styling

This project uses Tailwind CSS. Modify `tailwind.config.js` to customize the theme.

## License

MIT
