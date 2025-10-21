const express = require('express');
const http = require('http');
const WebSocket = require('ws');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.get('/', (req, res) => {
  res.send('✅ Voice WebSocket Server is Running');
});

wss.on('connection', (ws) => {
  console.log('🎧 User connected');

  ws.on('message', (message) => {
    // Broadcast audio or data to all connected clients except sender
    wss.clients.forEach(client => {
      if (client !== ws && client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  });

  ws.on('close', () => console.log('❌ User disconnected'));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Voice server running on port ${PORT}`));
