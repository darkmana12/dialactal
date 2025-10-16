// Simple external test: connect two clients to existing relay on ws://127.0.0.1:8787 and ensure echo to other only
import WebSocket from 'ws';
import { spawn } from 'child_process';

const room = 'ECHO1';

// Start standalone relay server as a child process, passing a random port via env (PORT=0)
const serverProc = spawn('node', ['server/server.js'], { stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: '0' } });

// Wait for server to be ready and capture the actual URL
const url = await new Promise((resolve, reject) => {
  const readyRegex = /WS relay listening on (ws:\/\/[^\s]+)/;
  const timeout = setTimeout(() => reject(new Error('Server start timeout')), 7000);
  const onData = (chunk) => {
    const s = chunk.toString();
    const m = s.match(readyRegex);
    if (m && m[1]) {
      clearTimeout(timeout);
      cleanup();
      resolve(m[1]);
    }
  };
  const onErr = (chunk) => {
    // Still watch stderr for readiness messages if any
    onData(chunk);
  };
  const cleanup = () => {
    serverProc.stdout.off('data', onData);
    serverProc.stderr.off('data', onErr);
  };
  serverProc.stdout.on('data', onData);
  serverProc.stderr.on('data', onErr);
  serverProc.on('error', (e) => { clearTimeout(timeout); reject(e); });
  serverProc.on('exit', (code) => { /* server may exit later; ignore here */ });
});

const a = new WebSocket(url);
const b = new WebSocket(url);

function send(ws, obj) { ws.send(JSON.stringify(obj)); }

const results = { aJoined: false, bJoined: false, bReceived: false, aLoop: false };

await new Promise((resolve, reject) => {
  let done = false;
  const timeout = setTimeout(() => {
    if (!done) {
      console.error('Timeout waiting for echo', results);
      reject(new Error('Timeout'));
    }
  }, 8000);

  a.on('open', () => send(a, { op: 'join', roomId: room }));
  b.on('open', () => send(b, { op: 'join', roomId: room }));

  let sent = false;
  const trySend = () => {
    if (!sent && results.aJoined && results.bJoined) {
      sent = true;
      setTimeout(() => {
        send(a, { op: 'event', event: { type: 'guess', from: 'A', payload: { guess: 'salut' } } });
      }, 100);
    }
  };

  const onJoined = (who) => { results[who] = true; trySend(); };

  a.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.op === 'joined') onJoined('aJoined');
    if (data.op === 'event') results.aLoop = true;
  });
  a.on('error', (e) => console.error('Client A error:', e));
  a.on('close', () => {});

  b.on('message', (msg) => {
    const data = JSON.parse(msg.toString());
    if (data.op === 'joined') onJoined('bJoined');
    if (data.op === 'event' && data.event?.payload?.guess === 'salut') {
      results.bReceived = true;
      if (!done) {
        done = true;
        clearTimeout(timeout);
        try { a.close(); } catch {}
        try { b.close(); } catch {}
        resolve();
      }
    }
  });
  b.on('error', (e) => console.error('Client B error:', e));
  b.on('close', () => {});
});

console.log('External WS echo test:', results);
// Teardown relay server
try { serverProc.kill(); } catch {}
if (!results.bReceived || results.aLoop) process.exit(1);
process.exit(0);
