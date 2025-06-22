import * as Y from 'yjs';
import * as encoding from 'lib0/encoding';
import * as decoding from 'lib0/decoding';
import { ydoc } from './yjs';

// Message types for BroadcastChannel
const MESSAGE_SYNC = 0;
const MESSAGE_AWARENESS = 1;
const MESSAGE_STATE_UPDATE = 2;

interface BroadcastMessage {
  type: number;
  data: Uint8Array;
  origin?: string;
}

export class BroadcastChannelProvider {
  private channel: BroadcastChannel;
  private doc: Y.Doc;
  private _synced: boolean = false;
  private onSyncCallbacks: Set<(synced: boolean) => void> = new Set();
  private onStatusCallbacks: Set<(status: { status: string }) => void> = new Set();

  constructor(channelName: string = 'lumencanvas-sync', doc?: Y.Doc) {
    this.doc = doc || ydoc;
    this.channel = new BroadcastChannel(channelName);

    // Setup listeners
    this.setupChannelListeners();
    this.setupDocListeners();

    // Announce ourselves
    this.broadcastStateUpdate();
  }

  private setupChannelListeners() {
    this.channel.onmessage = (event: MessageEvent<BroadcastMessage>) => {
      const message = event.data;
      
      // Ignore our own messages
      if (message.origin === this.getOriginId()) return;

      switch (message.type) {
        case MESSAGE_SYNC:
          this.handleSyncMessage(message.data);
          break;
        case MESSAGE_AWARENESS:
          this.handleAwarenessMessage(message.data);
          break;
        case MESSAGE_STATE_UPDATE:
          this.handleStateUpdate(message.data);
          break;
      }
    };

    // Handle connection status
    this.notifyStatus({ status: 'connected' });
  }

  private setupDocListeners() {
    // Listen for document updates
    this.doc.on('update', (update: Uint8Array, origin: any) => {
      // Don't broadcast updates that came from broadcast channel
      if (origin !== this) {
        this.broadcastUpdate(update);
      }
    });
  }

  private handleSyncMessage(data: Uint8Array) {
    const decoder = decoding.createDecoder(data);
    decoding.readVarUint(decoder); // Read message type

    // Apply the update to our document
    Y.applyUpdate(this.doc, decoding.readVarUint8Array(decoder), this);
    
    this._synced = true;
    this.notifySync(true);
  }

  private handleAwarenessMessage(_data: Uint8Array) {
    // Handle awareness updates (cursor positions, user info, etc.)
    // This would integrate with y-protocols/awareness
  }

  private handleStateUpdate(data: Uint8Array) {
    // Apply state update from another window
    Y.applyUpdate(this.doc, data, this);
  }

  private broadcastUpdate(update: Uint8Array) {
    const encoder = encoding.createEncoder();
    encoding.writeVarUint(encoder, MESSAGE_SYNC);
    encoding.writeVarUint8Array(encoder, update);

    this.channel.postMessage({
      type: MESSAGE_SYNC,
      data: encoding.toUint8Array(encoder),
      origin: this.getOriginId()
    });
  }

  private broadcastStateUpdate() {
    const stateVector = Y.encodeStateVector(this.doc);
    
    this.channel.postMessage({
      type: MESSAGE_STATE_UPDATE,
      data: stateVector,
      origin: this.getOriginId()
    });
  }

  private getOriginId(): string {
    // Unique ID for this window/tab instance
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API
  on(event: 'sync', callback: (synced: boolean) => void): void;
  on(event: 'status', callback: (status: { status: string }) => void): void;
  on(event: string, callback: any): void {
    if (event === 'sync') {
      this.onSyncCallbacks.add(callback);
    } else if (event === 'status') {
      this.onStatusCallbacks.add(callback);
    }
  }

  off(event: 'sync', callback: (synced: boolean) => void): void;
  off(event: 'status', callback: (status: { status: string }) => void): void;
  off(event: string, callback: any): void {
    if (event === 'sync') {
      this.onSyncCallbacks.delete(callback);
    } else if (event === 'status') {
      this.onStatusCallbacks.delete(callback);
    }
  }

  private notifySync(synced: boolean) {
    this.onSyncCallbacks.forEach(callback => callback(synced));
  }

  private notifyStatus(status: { status: string }) {
    this.onStatusCallbacks.forEach(callback => callback(status));
  }

  get synced(): boolean {
    return this._synced;
  }

  destroy() {
    this.channel.close();
    this.onSyncCallbacks.clear();
    this.onStatusCallbacks.clear();
  }
}