import Pusher from 'pusher-js';

// Configure Pusher client for Soketi
const pusher = new Pusher(process.env.NEXT_PUBLIC_SOKETI_APP_KEY || 'rLJX95HrpiMxGmGyvkcuoZu2nKVQQOxjQCo2GuGsVKGBVj4acpnWtUyyaj3cMDDo', {
  wsHost: process.env.NEXT_PUBLIC_SOKETI_HOST || 'soketi-ys0wo4gcswc8gc84ggs88g0o.proximacentauri.solutions',
  wsPort: 443,
  wssPort: 443, 
  forceTLS: true,
  enabledTransports: ['ws', 'wss'],
  cluster: process.env.NEXT_PUBLIC_SOKETI_CLUSTER || 'mt1',
  disableStats: true,
});

export { pusher };

// Helper functions for chat features
export const subscribeToRoom = (roomId: string) => {
  return pusher.subscribe(`room.${roomId}`);
};

export const subscribeToUserNotifications = (userId: string) => {
  return pusher.subscribe(`user.${userId}`);
};

export const unsubscribeFromRoom = (roomId: string) => {
  pusher.unsubscribe(`room.${roomId}`);
};

export const unsubscribeFromUser = (userId: string) => {
  pusher.unsubscribe(`user.${userId}`);
};

// Disconnect when app unmounts
export const disconnect = () => {
  pusher.disconnect();
};