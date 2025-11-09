import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Track online clients
const groups = {}; // { groupId: Set<ws> }
const users = {};  // { userId: ws }

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // === Register user ===
      if (data.type === "register") {
        users[data.userId] = ws;
        ws.userId = data.userId;
        console.log(`✅ Registered user: ${data.userId}`);
      }

      // === Join / Switch group ===
      if (data.type === "join" || data.type === "switch") {
        const newGroupId = data.groupId || data.newGroupId;
        if (ws.groupId && groups[ws.groupId]) {
          groups[ws.groupId].delete(ws);
          console.log(`🚪 User ${ws.userId} left group ${ws.groupId}`);
        }

        const group = groups[newGroupId] || new Set();
        group.add(ws);
        groups[newGroupId] = group;
        ws.groupId = newGroupId;
        console.log(`👥 User ${ws.userId} joined group ${newGroupId}`);
      }

      // === Handle audio chunks ===
      if (data.type === "audio" && ws.groupId) {
        // Stream chunk to other members in the same group
        groups[ws.groupId]?.forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: "audio",
              sender: data.sender,
              groupId: ws.groupId,
              chunk: data.chunk,
              final: data.final || false
            }));
          }
        });

        // Optional: targeted 1-to-1 delivery
        if (Array.isArray(data.targetIds)) {
          data.targetIds.forEach(id => {
            const target = users[id];
            if (target && target.readyState === 1) {
              target.send(JSON.stringify({
                type: "audio",
                sender: data.sender,
                groupId: ws.groupId,
                chunk: data.chunk,
                final: data.final || false
              }));
            }
          });
        }
      }

    } catch (err) {
      console.error("Message error:", err);
    }
  });

  ws.on("close", () => {
    if (ws.groupId && groups[ws.groupId]) groups[ws.groupId].delete(ws);
    if (ws.userId) delete users[ws.userId];
    console.log(`🔌 Disconnected: ${ws.userId || "unknown user"}`);
  });
});

app.get("/", (req, res) => res.send("✅ Voice WebSocket server running!"));
const PORT = process.env.PORT || 8080;
server.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
