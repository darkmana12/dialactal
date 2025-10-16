// Simple WebSocket relay server with rooms (ESM)
// Usage: node server/server.js

import http from 'http';
import WebSocket, { WebSocketServer } from 'ws';

const PORT = process.env.PORT || 8787;

const server = http.createServer();
const wss = new WebSocketServer({ server });

/** @type {Map<string, Set<WebSocket>>} */
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
      // Optionally acknowledge
      ws.send(JSON.stringify({ op: 'joined', roomId }));
      // Notify others of join
      broadcastToRoom(roomId, { op: 'peer-joined', peer: 'unknown' }, ws);
    } else if (op === 'leave') {
      leaveRoom(ws);
      ws.send(JSON.stringify({ op: 'left' }));
    } else if (op === 'event') {
      const roomId = ws._roomId;
      if (!roomId) return;
      // Relay to others in the room
      broadcastToRoom(roomId, { op: 'event', roomId, event: data.event }, ws);
    }
  });

  ws.on('close', () => {
    // Capture roomId before clearing it in leaveRoom
    const r = ws._roomId;
    leaveRoom(ws);
    if (r) broadcastToRoom(r, { op: 'peer-left' }, ws);
  });
});

server.on('error', (err) => {
  console.error('HTTP server error:', err);
});

server.listen(PORT, '127.0.0.1', () => {
  const addr = server.address();
  const host = typeof addr === 'object' && addr ? addr.address : '127.0.0.1';
  const port = typeof addr === 'object' && addr ? addr.port : PORT;
  console.log(`WS relay listening on ws://${host}:${port}`);
});
