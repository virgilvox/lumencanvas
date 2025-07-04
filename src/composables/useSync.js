import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ref, onUnmounted }from 'vue';

const instances = new Map();

export function useSync(projectId) {
  if (!instances.has(projectId)) {
    const doc = new Y.Doc();
    
    // Determine WebSocket URL based on environment
    const getWebSocketUrl = () => {
      const hostname = window.location.hostname;
      
      // Development environment
      if (hostname === 'localhost' || hostname === '127.0.0.1') {
        return 'ws://localhost:1234';
      }
      
      // Production environment
      return 'wss://y.monolith.services';
    };
    
    const wsUrl = getWebSocketUrl();
    console.log(`🔗 Connecting to Yjs server: ${wsUrl} (room: ${projectId})`);
    
    const provider = new WebsocketProvider(
      wsUrl,
      projectId,
      doc
    );
    const connectionStatus = ref('disconnected');
    const synced = ref(false);

    provider.on('status', event => {
      connectionStatus.value = event.status;
      console.log(`🔗 Connection status: ${event.status}`);
    });
    
    provider.on('sync', event => {
      synced.value = event.sync;
      if(event.sync) {
        connectionStatus.value = 'connected';
        console.log('✅ Document synchronized');
      }
    });

    provider.on('error', event => {
      console.error('❌ WebSocket error:', event);
      connectionStatus.value = 'error';
    });

    provider.on('connection-close', event => {
      console.log('🔌 Connection closed:', event);
    });

    provider.on('connection-error', event => {
      console.error('❌ Connection error:', event);
    });

    instances.set(projectId, {
      doc,
      provider,
      yLayers: doc.getArray('layers'),
      yCanvas: doc.getMap('canvas'),
      connectionStatus,
      synced,
      refCount: 0,
      disconnect: () => {
        provider.destroy();
        instances.delete(projectId);
      }
    });
  }

  const instance = instances.get(projectId);
  instance.refCount++;

  onUnmounted(() => {
    instance.refCount--;
    if (instance.refCount === 0) {
      instance.disconnect(); 
    }
  });

  return instance;
}