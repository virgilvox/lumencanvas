import { useEffect, useState } from 'react';
import { WebsocketProvider } from 'y-websocket';
import { ydoc } from '@/lib/yjs';

export function useWebSocketSync(
  serverUrl: string = 'ws://localhost:1234',
  roomName: string = 'lumencanvas-default'
) {
  const [provider, setProvider] = useState<WebsocketProvider | null>(null);
  const [synced, setSynced] = useState(false);
  const [status, setStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');

  useEffect(() => {
    // Create WebSocket provider
    const wsProvider = new WebsocketProvider(
      serverUrl,
      roomName,
      ydoc,
      {
        connect: true,
        params: {
          // Add any authentication or room parameters here
        }
      }
    );

    // Listen for sync events
    wsProvider.on('sync', (isSynced: boolean) => {
      setSynced(isSynced);
    });

    // Listen for status changes
    wsProvider.on('status', (event: { status: string }) => {
      setStatus(event.status as 'disconnected' | 'connecting' | 'connected');
    });

    setProvider(wsProvider);

    // Cleanup on unmount
    return () => {
      wsProvider.disconnect();
      wsProvider.destroy();
    };
  }, [serverUrl, roomName]);

  return {
    provider,
    synced,
    status,
    connected: status === 'connected'
  };
}