export type CoopEventType =
  | 'hello'
  | 'goodbye'
  | 'guess'
  | 'reveal'
  | 'load-article'
  | 'new-game'
  | 'sync-request'
  | 'sync-state';

export interface CoopEvent<T = any> {
  type: CoopEventType;
  payload?: T;
  from: string; // peer id
}

export interface SyncService {
  create(roomId: string, onMessage: (evt: CoopEvent) => void): void;
  join(roomId: string, onMessage: (evt: CoopEvent) => void): void;
  leave(): void;
  send<T = any>(evt: CoopEvent<T>): void;
  getPeerId(): string;
  getRoomId(): string | null;
}

// Simple BroadcastChannel-based implementation for local multi-tab coop
export class BroadcastChannelSyncService implements SyncService {
  private channel: BroadcastChannel | null = null;
  private roomId: string | null = null;
  private onMessageCb: ((evt: CoopEvent) => void) | null = null;
  private peerId: string = Math.random().toString(36).slice(2, 8);

  getPeerId(): string { return this.peerId; }
  getRoomId(): string | null { return this.roomId; }

  private getChannelName(roomId: string) {
    return `dialactal-coop-${roomId}`;
  }

  create(roomId: string, onMessage: (evt: CoopEvent) => void): void {
    this.join(roomId, onMessage);
  }

  join(roomId: string, onMessage: (evt: CoopEvent) => void): void {
    this.leave();
    if (typeof BroadcastChannel === 'undefined') {
      console.warn('BroadcastChannel not supported in this browser.');
      return;
    }
    this.roomId = roomId;
    this.onMessageCb = onMessage;
    this.channel = new BroadcastChannel(this.getChannelName(roomId));
    this.channel.onmessage = (e: MessageEvent<CoopEvent>) => {
      const data = e.data;
      if (!data || !data.type) return;
      // Ignore self
      if (data.from === this.peerId) return;
      this.onMessageCb && this.onMessageCb(data);
    };
    // announce presence
    this.send({ type: 'hello', from: this.peerId });
  }

  leave(): void {
    if (this.channel) {
      try { this.send({ type: 'goodbye', from: this.peerId }); } catch {}
      this.channel.close();
    }
    this.channel = null;
    this.roomId = null;
    this.onMessageCb = null;
  }

  send<T = any>(evt: CoopEvent<T>): void {
    if (!this.channel || !this.roomId) return;
    const payload: CoopEvent<T> = { ...evt, from: evt.from || this.peerId } as any;
    this.channel.postMessage(payload);
  }
}
