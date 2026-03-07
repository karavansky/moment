// Web Worker for sending messages at precise intervals
// This worker runs in a separate thread and is not affected by browser tab throttling

let sessions = [];
let sendInterval = null;

// Message handler from main thread
self.onmessage = function (e) {
  const { type, data } = e.data;
  console.log("[Worker] Received:", type, data);

  switch (type) {
    case "init":
      // Initialize sessions array
      sessions = data.sessions || [];
      console.log("[Worker] Initialized with", sessions.length, "sessions");
      break;

    case "addSession":
      // Add a new session
      sessions.push(data.session);
      console.log("[Worker] Added session", data.session.id, "Total:", sessions.length);
      break;

    case "removeSession":
      // Remove a session
      sessions = sessions.filter((s) => s.id !== data.sessionId);
      console.log("[Worker] Removed session", data.sessionId, "Remaining:", sessions.length);
      break;

    case "start":
      // Start sending messages
      if (sendInterval) {
        console.log("[Worker] Already running");
        return;
      }

      const interval = data.interval || 1000; // Default 1 second
      console.log("[Worker] Starting message sending, interval:", interval, "ms");

      sendInterval = setInterval(() => {
        const timestamp = Date.now();

        // Send message command for each active session
        sessions.forEach((session) => {
          const cpuValue = Math.floor(Math.random() * 100);
          console.log("[Worker] Sending to session", session.id, "cpu:", cpuValue);
          self.postMessage({
            type: "sendMessage",
            sessionId: session.id,
            message: {
              type: "cpu",
              message: String(cpuValue),
            },
            timestamp: timestamp,
          });
        });

        // Report stats
        self.postMessage({
          type: "stats",
          activeCount: sessions.length,
          timestamp: timestamp,
        });
      }, interval);
      break;

    case "stop":
      // Stop sending messages
      if (sendInterval) {
        clearInterval(sendInterval);
        sendInterval = null;
        console.log("[Worker] Stopped message sending");
      }
      self.postMessage({ type: "stopped" });
      break;

    case "updateSessions":
      // Update entire sessions array (useful for bulk updates)
      sessions = data.sessions || [];
      console.log("[Worker] Updated sessions, total:", sessions.length);
      break;

    default:
      console.log("[Worker] Unknown message type:", type);
  }
};

// Error handler
self.onerror = function (error) {
  console.error("[Worker] Error:", error);
  self.postMessage({
    type: "error",
    error: error.message,
  });
};

console.log("[Worker] Message worker initialized");
