import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);

const wss = new WebSocketServer({ server });

// Keep track of users and groups
const groups = {}; // { groupId: Set<ws> }
const users = {};  // { userId: ws }

wss.on("connection", (ws) => {
  console.log("🟢 Client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      // === Register user ===
      if (data.type === "register") {
        users[data.userId] = ws;
        ws.userId = data.userId;
        console.log(`✅ User registered: ${data.userId}`);
      }

      // === Join group ===
      if (data.type === "join") {
        const group = groups[data.groupId] || new Set();
        group.add(ws);
        groups[data.groupId] = group;
        ws.groupId = data.groupId;
        console.log(`👥 ${data.userId} joined group ${data.groupId}`);
      }

      // === Live audio stream ===
      if (data.type === "audio-chunk" && ws.groupId) {
        const group = groups[ws.groupId];
        if (group) {
          group.forEach((client) => {
            if (client !== ws && client.readyState === 1) {
              client.send(
                JSON.stringify({
                  type: "audio-chunk",
                  chunk: data.chunk,  // base64-encoded audio
                  sender: ws.userId,
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
    if (ws.groupId && groups[ws.groupId]) groups[ws.groupId].delete(ws);
    if (ws.userId && users[ws.userId]) delete users[ws.userId];
    console.log(`🔴 Disconnected: ${ws.userId || "unknown"}`);
  });
});

app.get("/", (req, res) => {
  res.send("🎙️ Live Voice Streaming WebSocket running!");
});

const PORT = process.env.PORT || 8080;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
