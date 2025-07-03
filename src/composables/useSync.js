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

    provider.on('status', event => {
      connectionStatus.value = event.status;
    });

    instances.set(projectId, {
      doc,
      provider,
      yLayers: doc.getArray('layers'),
      yCanvas: doc.getMap('canvas'),
      connectionStatus,
      disconnect: () => {
        provider.destroy();
        instances.delete(projectId);
      }
    });
  }

  const instance = instances.get(projectId);

  onUnmounted(() => {
    // We can manage disconnection more carefully later if needed.
    // instance.disconnect(); 
  });

  return instance;
}