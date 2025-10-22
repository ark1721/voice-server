import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });

// Keep track of online clients
const groups = {}; // { groupId: Set<ws> }
const users = {};  // { userId: ws }

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // === User registration (for 1-to-1) ===
      if (data.type === "register") {
        users[data.userId] = ws;
        ws.userId = data.userId;
        console.log(`User registered: ${data.userId}`);
      }

      // === Join a group ===
      if (data.type === "join") {
        const group = groups[data.groupId] || new Set();
        group.add(ws);
        groups[data.groupId] = group;
        ws.groupId = data.groupId;
        console.log(`User joined group ${data.groupId}`);
      }

      // === Audio message for group ===
      if (data.type === "audio" && ws.groupId) {
        // Group forwarding
        groups[ws.groupId]?.forEach((client) => {
          if (client !== ws && client.readyState === 1) {
            client.send(
              JSON.stringify({
                type: "audio",
                chunk: data.chunk,
                sender: data.sender,
              })
            );
          }
        });

        // 1-to-1 forwarding if targetIds are specified
        if (data.targetIds && Array.isArray(data.targetIds)) {
          data.targetIds.forEach((id) => {
            const targetClient = users[id];
            if (targetClient && targetClient.readyState === 1) {
              targetClient.send(
                JSON.stringify({
                  type: "audio",
                  chunk: data.chunk,
                  sender: data.sender,
                })
              );
            }
          });
        }
      }

    } catch (err) {
      console.error("Message error:", err);
    }
  });

  ws.on("close", () => {
    // Remove from group
    if (ws.groupId && groups[ws.groupId]) {
      groups[ws.groupId].delete(ws);
    }

    // Remove from user map
    if (ws.userId && users[ws.userId]) {
      delete users[ws.userId];
    }

    console.log(`Client disconnected: ${ws.userId || ws.groupId}`);
  });
});

app.get("/", (req, res) => {
  res.send("✅ Voice WebSocket server running!");
});

// Use Railway port or default
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
