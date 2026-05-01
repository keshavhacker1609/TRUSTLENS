import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import useUIStore from '../store/uiStore';

let socketInstance = null;

export default function useSocket() {
  const [connected, setConnected] = useState(false);
  const addLiveClaim = useUIStore((s) => s.addLiveClaim);

  useEffect(() => {
    if (!socketInstance) {
      const wsUrl = import.meta.env.VITE_WS_URL || window.location.origin;
      socketInstance = io(wsUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
      });
    }

    const socket = socketInstance;

    function onConnect() { setConnected(true); }
    function onDisconnect() { setConnected(false); }
    function onNewClaim(claim) { addLiveClaim(claim); }

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('newClaim', onNewClaim);

    if (socket.connected) setConnected(true);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('newClaim', onNewClaim);
    };
  }, [addLiveClaim]);

  return { connected };
}
