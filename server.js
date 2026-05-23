const http = require('http');
const WebSocket = require('ws');

const server = http.createServer((req, res) => {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  res.end('Remote Flash Server OK');
});

const wss = new WebSocket.Server({ server });

// rooms: { roomCode: Set of ws clients }
const rooms = {};

wss.on('connection', (ws) => {
  ws.room = null;

  ws.on('message', (msg) => {
    try {
      const data = JSON.parse(msg);

      // JOIN room
      if (data.type === 'join') {
        const room = data.room;
        ws.room = room;
        ws.role = data.role;
        if (!rooms[room]) rooms[room] = new Set();
        rooms[room].add(ws);

        // Broadcast to others in room
        broadcast(room, ws, { type: 'hello', role: data.role });
        return;
      }

      // Relay message to others in same room
      if (ws.room) {
        broadcast(ws.room, ws, data);
      }
    } catch(e) {}
  });

  ws.on('close', () => {
    if (ws.room && rooms[ws.room]) {
      rooms[ws.room].delete(ws);
      if (rooms[ws.room].size === 0) delete rooms[ws.room];
    }
  });
});

function broadcast(room, sender, data) {
  if (!rooms[room]) return;
  const msg = JSON.stringify(data);
  rooms[room].forEach((client) => {
    if (client !== sender && client.readyState === WebSocket.OPEN) {
      client.send(msg);
    }
  });
}

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log('Server running on port', PORT));
