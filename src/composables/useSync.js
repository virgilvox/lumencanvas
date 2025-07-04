import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { ref, onUnmounted }from 'vue';

const instances = new Map();

export function useSync(projectId) {
  if (!instances.has(projectId)) {
    const doc = new Y.Doc();
    const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const wsUrl = `${wsProtocol}://64.227.20.236:1234`;
    const provider = new WebsocketProvider(
      wsUrl,
      projectId,
      doc
    );
    const connectionStatus = ref('disconnected');
    const synced = ref(false);

    provider.on('status', event => {
      connectionStatus.value = event.status;
    });
    
    provider.on('sync', event => {
      synced.value = event.sync;
      if(event.sync) {
        connectionStatus.value = 'connected';
      }
    });

    provider.on('error', event => {
      console.error('WebSocket error:', event);
      connectionStatus.value = 'error';
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