import Pusher from 'pusher';

const pusher = new Pusher({
  appId: process.env.SOKETI_APP_ID || 'app-id',
  key: process.env.SOKETI_APP_KEY || 'rLJX95HrpiMxGmGyvkcuoZu2nKVQQOxjQCo2GuGsVKGBVj4acpnWtUyyaj3cMDDo', 
  secret: process.env.SOKETI_APP_SECRET || 'kq3ixcYCq1cJvk5vnePfvV7L2NfNCsOHn823BcjC9bPOUeLawW1oItkNoBJROHIj',
  cluster: process.env.SOKETI_CLUSTER || 'mt1',
  host: process.env.SOKETI_HOST || 'soketi-ys0wo4gcswc8gc84ggs88g0o.proximacentauri.solutions',
  port: '443',
  useTLS: true,
});

export { pusher };

// Helper functions for broadcasting events
export const broadcastToRoom = async (roomId: string, event: string, data: any) => {
  try {
    await pusher.trigger(`room.${roomId}`, event, data);
  } catch (error) {
    console.error('Failed to broadcast to room:', error);
  }
};

export const broadcastToUser = async (userId: string, event: string, data: any) => {
  try {
    await pusher.trigger(`user.${userId}`, event, data);
  } catch (error) {
    console.error('Failed to broadcast to user:', error);
  }
};

export const broadcastPresenceUpdate = async (roomId: string, user: any, action: 'join' | 'leave') => {
  try {
    await pusher.trigger(`room.${roomId}`, 'presence-update', {
      user,
      action,
      timestamp: Date.now()
    });
  } catch (error) {
    console.error('Failed to broadcast presence update:', error);
  }
};