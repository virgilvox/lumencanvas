import { useEffect, useState } from 'react';
import { BroadcastChannelProvider } from '@/lib/broadcastChannel';
import { ydoc } from '@/lib/yjs';

export function useBroadcastSync(channelName: string = 'lumencanvas-sync') {
  const [provider, setProvider] = useState<BroadcastChannelProvider | null>(null);
  const [synced, setSynced] = useState(false);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');

  useEffect(() => {
    // Create the broadcast channel provider
    const bcProvider = new BroadcastChannelProvider(channelName, ydoc);

    // Listen for sync status
    bcProvider.on('sync', (isSynced) => {
      setSynced(isSynced);
    });

    // Listen for connection status
    bcProvider.on('status', (statusEvent) => {
      setStatus(statusEvent.status as 'connecting' | 'connected' | 'disconnected');
    });

    setProvider(bcProvider);

    // Cleanup on unmount
    return () => {
      bcProvider.destroy();
    };
  }, [channelName]);

  return {
    provider,
    synced,
    status
  };
}