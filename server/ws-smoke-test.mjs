// Quick smoke test for the relay server: two clients in one room (spawns relay in-process)
import WebSocket from 'ws';
import { startRelay } from './relay.mjs';

const room = 'TEST42';

const { host, port, server } = await startRelay({ host: '127.0.0.1', port: 0 });
const url = `ws://${host}:${port}`;

const a = new WebSocket(url);
const b = new WebSocket(url);

function send(ws, obj) { ws.send(JSON.stringify(obj)); }

const results = { aJoined: false, bJoined: false, bGot: false };

await new Promise((resolve, reject) => {
  let done = false;
  const timeout = setTimeout(() => {
    if (!done) {
      console.error('Timeout waiting for join/event', results);
      reject(new Error('Timeout'));
    }
  }, 4000);

  a.on('open', () => send(a, { op: 'join', roomId: room }));
  b.on('open', () => send(b, { op: 'join', roomId: room }));
  a.on('error', (e) => console.error('Client A error:', e));
  b.on('error', (e) => console.error('Client B error:', e));

  const trySend = () => {
    if (results.aJoined && results.bJoined) {
      // Send from A, expect B to receive
      send(a, { op: 'event', event: { type: 'guess', from: 'A', payload: { guess: 'bonjour' } } });
    }
  };

  const onJoined = (who) => {
    results[who] = true;
    trySend();
  };

  b.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.op === 'joined') onJoined('bJoined');
    if (data.op === 'event' && data.event?.type === 'guess') {
      results.bGot = true;
      if (!done) { done = true; clearTimeout(timeout); resolve(); }
    }
  });

  a.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.op === 'joined') onJoined('aJoined');
    // A should not receive its own event back; if it does, fail
    if (data.op === 'event' && data.event?.type === 'guess') {
      clearTimeout(timeout);
      reject(new Error('A received its own event'));
    }
  });
});

console.log('WS relay smoke test passed:', results);
server.close();
process.exit(0);
