import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

export function startRelay({ host = '127.0.0.1', port = 0 } = {}) {
  const server = http.createServer();
  const wss = new WebSocketServer({ server });

  /** @type {Map<string, Set<any>>} */
  const rooms = new Map();

  function joinRoom(ws, roomId) {
    if (!rooms.has(roomId)) rooms.set(roomId, new Set());
    rooms.get(roomId).add(ws);
    ws._roomId = roomId;
  }

  function leaveRoom(ws) {
    const roomId = ws._roomId;
    if (!roomId) return;
    const set = rooms.get(roomId);
    if (set) {
      set.delete(ws);
      if (set.size === 0) rooms.delete(roomId);
    }
    ws._roomId = null;
  }

  function broadcastToRoom(roomId, data, except) {
    const set = rooms.get(roomId);
    if (!set) return;
    for (const client of set) {
      if (client !== except && client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify(data));
      }
    }
  }

  wss.on('connection', (ws) => {
    ws._roomId = null;
    ws.on('message', (msg) => {
      let data;
      try { data = JSON.parse(msg.toString()); } catch { return; }
      const op = data.op;
      if (op === 'join') {
        const roomId = String(data.roomId || '').trim();
        if (!roomId) return;
        if (ws._roomId) leaveRoom(ws);
        joinRoom(ws, roomId);
        ws.send(JSON.stringify({ op: 'joined', roomId }));
      } else if (op === 'leave') {
        leaveRoom(ws);
        ws.send(JSON.stringify({ op: 'left' }));
      } else if (op === 'event') {
        const roomId = ws._roomId;
        if (!roomId) return;
        broadcastToRoom(roomId, { op: 'event', roomId, event: data.event }, ws);
      }
    });

    ws.on('close', () => {
      leaveRoom(ws);
    });
  });

  return new Promise((resolve, reject) => {
    server.on('error', reject);
    server.listen(port, host, () => {
      const addr = server.address();
      const actual = typeof addr === 'object' && addr ? { host: addr.address, port: addr.port } : { host, port };
      resolve({ server, wss, ...actual });
    });
  });
}
