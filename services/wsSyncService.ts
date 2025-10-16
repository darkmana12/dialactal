export type CoopEventType =
  | 'hello'
  | 'goodbye'
  | 'joined'
  | 'peer-joined'
  | 'peer-left'
  | 'guess'
  | 'reveal'
  | 'load-article'
  | 'new-game'
  | 'sync-request';

export interface CoopEvent<T = any> {
  type: CoopEventType;
  payload?: T;
  from: string; // peer id (client-generated)
}

export interface SyncService {
  create(roomId: string, onMessage: (evt: CoopEvent) => void): void;
  join(roomId: string, onMessage: (evt: CoopEvent) => void): void;
  leave(): void;
  send<T = any>(evt: CoopEvent<T>): void;
  getPeerId(): string;
  getRoomId(): string | null;
}

// Minimal WebSocket-based implementation for online coop
export class WebSocketSyncService implements SyncService {
  private ws: WebSocket | null = null;
  private roomId: string | null = null;
  private onMessageCb: ((evt: CoopEvent) => void) | null = null;
  private peerId: string = Math.random().toString(36).slice(2, 8);
  private url: string;

  constructor(url: string) {
    this.url = url;
  }

  getPeerId(): string { return this.peerId; }
  getRoomId(): string | null { return this.roomId; }

  private ensureSocket() {
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED) {
      this.ws = new WebSocket(this.url);
      this.ws.onmessage = (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data as string);
          if (data.op === 'event' && data.event && this.onMessageCb) {
            const evt = data.event as CoopEvent;
            // ignore self
            if (evt.from === this.peerId) return;
            this.onMessageCb(evt);
          } else if (data.op === 'joined' && this.onMessageCb) {
            this.onMessageCb({ type: 'joined', from: 'server', payload: { roomId: data.roomId } });
          } else if ((data.op === 'peer-joined' || data.op === 'peer-left') && this.onMessageCb) {
            this.onMessageCb({ type: data.op, from: 'server' } as any);
          }
        } catch {}
      };
      this.ws.onclose = () => {
        // try to clean state
      };
    }
  }

  private sendRaw(obj: any) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      const sendLater = () => {
        if (this.ws && this.ws.readyState === WebSocket.OPEN) {
          this.ws.send(JSON.stringify(obj));
        } else {
          setTimeout(sendLater, 100);
        }
      };
      sendLater();
    } else {
      this.ws.send(JSON.stringify(obj));
    }
  }

  create(roomId: string, onMessage: (evt: CoopEvent) => void): void {
    this.join(roomId, onMessage);
  }

  join(roomId: string, onMessage: (evt: CoopEvent) => void): void {
    this.leave();
    this.onMessageCb = onMessage;
    this.roomId = roomId;
    this.ensureSocket();
    const joinMsg = { op: 'join', roomId };
    const doJoin = () => this.sendRaw(joinMsg);
    setTimeout(doJoin, 50);
  }

  leave(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ op: 'leave' }));
    }
    this.roomId = null;
    this.onMessageCb = null;
  }

  send<T = any>(evt: CoopEvent<T>): void {
    if (!this.roomId) return;
    const payload: CoopEvent<T> = { ...evt, from: evt.from || this.peerId } as any;
    this.sendRaw({ op: 'event', event: payload });
  }
}
