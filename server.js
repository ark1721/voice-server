import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: process.env.PORT || 8080 });
const groups = {}; // { groupId: Set<ws> }

wss.on('connection', (ws) => {
  console.log('Client connected');

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      if (data.type === 'join') {
        const group = groups[data.groupId] || new Set();
        group.add(ws);
        groups[data.groupId] = group;
        ws.groupId = data.groupId;
        console.log(`User joined group ${data.groupId}`);
      }

      if (data.type === 'audio' && ws.groupId) {
        groups[ws.groupId].forEach(client => {
          if (client !== ws && client.readyState === 1) {
            client.send(JSON.stringify({
              type: 'audio',
              chunk: data.chunk,
              sender: data.sender,
            }));
          }
        });
      }
    } catch (err) {
      console.error(err);
    }
  });

  ws.on('close', () => {
    if (ws.groupId && groups[ws.groupId]) {
      groups[ws.groupId].delete(ws);
    }
  });
});

console.log('✅ Voice WebSocket server running...');
