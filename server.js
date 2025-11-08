import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Keep track of online clients
const groups = {}; // { groupId: Set<ws> }
const users = {};  // { userId: ws }

wss.on("connection", (ws) => {
  console.log("Client connected");

  // Track groups per connection (for proper leave handling)
  ws.joinedGroups = new Set();

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // === Register user ===
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
        ws.joinedGroups.add(data.groupId);
        console.log(`User ${ws.userId} joined group ${data.groupId}`);
      }

      // === Leave a group ===
      if (data.type === "leave") {
        const group = groups[data.groupId];
        if (group) {
          group.delete(ws);
          if (group.size === 0) delete groups[data.groupId]; // cleanup
          console.log(`User ${ws.userId} left group ${data.groupId}`);
        }
        ws.joinedGroups.delete(data.groupId);
      }

      // === Audio broadcast ===
      if (data.type === "audio" && data.groupId) {
        const group = groups[data.groupId];
        if (group) {
          group.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(
                JSON.stringify({
                  type: "audio",
                  chunk: data.chunk,
                  sender: data.sender,
                  groupId: data.groupId,
                })
              );
            }
          });
        }

        // Optional: send to specific users
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
    // Remove from all joined groups
    ws.joinedGroups?.forEach((groupId) => {
      const group = groups[groupId];
      if (group) {
        group.delete(ws);
        if (group.size === 0) delete groups[groupId];
      }
    });

    // Remove from user registry
    if (ws.userId) delete users[ws.userId];

    console.log(`Client disconnected: ${ws.userId || "unknown"}`);
  });
});

app.get("/", (req, res) => {
  res.send("✅ Voice WebSocket server running!");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
