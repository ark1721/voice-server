import express from "express";
import { WebSocketServer } from "ws";
import http from "http";

const app = express();
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocketServer({ server });
const groups = {}; // { groupId: Set<ws> }

wss.on("connection", (ws) => {
  console.log("Client connected");

  ws.on("message", (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === "join") {
        const group = groups[data.groupId] || new Set();
        group.add(ws);
        groups[data.groupId] = group;
        ws.groupId = data.groupId;
        console.log(`User joined group ${data.groupId}`);
      }

      if (data.type === "audio" && ws.groupId) {
        groups[ws.groupId].forEach((client) => {
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
      }
    } catch (err) {
      console.error("Message error:", err);
    }
  });

  ws.on("close", () => {
    if (ws.groupId && groups[ws.groupId]) {
      groups[ws.groupId].delete(ws);
    }
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
