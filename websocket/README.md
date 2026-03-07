# Vapor WebSocket Chat Server

💧 A real-time chat server built with Vapor 4 and Swift 6.2

## Features

- 🔐 Session-based authentication with Redis
- 🔄 WebSocket real-time messaging
- 📊 SQLite database for users and messages
- ⚡ High-performance session management with sliding expiration
- 🌐 CORS enabled for cross-origin requests
- 📝 Comprehensive logging and monitoring

## Quick Start

### Prerequisites

```bash
# Install Redis
sudo apt install redis-server

# Start Redis
sudo systemctl start redis-server
sudo systemctl enable redis-server

# Verify Redis is running
redis-cli PING
# Should return: PONG
```

## Getting Started
```bash

# Create log files with proper permissions
sudo touch /var/log/vapor-chat.log /var/log/vapor-chat-error.log
sudo chown a0e394:a0e394 /var/log/vapor-chat.log /var/log/vapor-chat-error.log

# Install the service
sudo cp /home/a0e394/testSwift/Hello/vapor-chat.service /etc/systemd/system/

# Reload systemd
sudo systemctl daemon-reload

# Enable service to start on boot
sudo systemctl enable vapor-chat

# Start the service
sudo systemctl start vapor-chat

# Check status
sudo systemctl status vapor-chat

# View logs
sudo journalctl -u vapor-chat -f
```
To build the project using the Swift Package Manager, run the following command in the terminal from the root of the project:
```bash
swift build
```

To run the project and start the server, use the following command:
```bash
swift run
```

To execute tests, use the following command:
```bash
swift test
```

## Documentation

- 📖 [API Documentation](API.md) - REST API endpoints
- 🔧 [Development Guide](DEVELOPMENT.md) - Development workflow and VSCode tasks
- 🔴 [Redis Session Guide](REDIS_SESSION_GUIDE.md) - Session management and TTL behavior
- ⚡ [Performance Analysis](PERFORMANCE_ANALYSIS.md) - SQLite bottlenecks and optimization guide
- 🎯 [Bottlenecks Summary](BOTTLENECKS_SUMMARY.md) - Quick summary of performance issues
- 📊 [Load Testing Results](LOAD_TEST_RESULTS.md) - Performance benchmarks

## Session Management

The server uses **Redis** for session storage with **sliding expiration**:

- **Initial TTL:** 24 hours
- **Auto-extension:** Session extends to full 24 hours on every activity
- **Activity triggers:**
  - WebSocket connection
  - Sending chat messages

**Result:** Active users stay logged in indefinitely, inactive sessions expire after 24 hours.

See [REDIS_SESSION_GUIDE.md](REDIS_SESSION_GUIDE.md) for details.

## Monitoring

```bash
# Server statistics
curl http://localhost:3003/server-stats

# View logs (rejected connections only)
sudo tail -f /var/log/vapor-chat.log | grep "❌"

# Check Redis sessions
redis-cli KEYS "session:*"
redis-cli TTL session:YOUR_SESSION_ID

# Monitor active WebSocket connections
curl http://localhost:3003/server-stats | grep "Active Connections"
```

### See more

- [Vapor Website](https://vapor.codes)
- [Vapor Documentation](https://docs.vapor.codes)
- [Vapor GitHub](https://github.com/vapor)
- [Vapor Community](https://github.com/vapor-community)
