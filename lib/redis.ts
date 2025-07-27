import Redis from 'ioredis';

let redisInstance: Redis | null = null;

// Create Redis instance with proper URL handling
const createRedisClient = () => {
  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    throw new Error('REDIS_URL environment variable is required');
  }
  
  console.log('Creating Redis client with URL:', redisUrl.split('@')[1]); // Don't log password
  return new Redis(redisUrl);
};

// Lazy initialization of Redis client
const getRedisClient = () => {
  if (!redisInstance) {
    redisInstance = createRedisClient();
    
    redisInstance.on('connect', () => {
      console.log('Connected to Redis');
    });

    redisInstance.on('error', (error) => {
      console.error('Redis connection error:', error);
    });
  }
  return redisInstance;
};

// Export a Proxy that will lazily create the Redis instance
const redis = new Proxy({} as Redis, {
  get(target, prop) {
    const client = getRedisClient();
    const value = client[prop as keyof Redis];
    if (typeof value === 'function') {
      return value.bind(client);
    }
    return value;
  }
});

export { redis };

export class RedisOperations {
  static async publishMessage(roomId: string, message: object) {
    return await redis.publish(`chat:${roomId}`, JSON.stringify(message));
  }

  static async subscribeToRoom(roomId: string) {
    return await redis.subscribe(`chat:${roomId}`);
  }

  static async addMessageToStream(roomId: string, userId: string, text: string) {
    return await redis.xadd(
      `messages:${roomId}`,
      '*',
      'userId', userId,
      'text', text,
      'timestamp', Date.now()
    );
  }

  static async getRecentMessages(roomId: string, count = 50) {
    return await redis.xrange(`messages:${roomId}`, '-', '+', 'COUNT', count);
  }

  static async addUserOnline(userId: string) {
    await redis.sadd('users:online', userId);
    return await redis.setex(`user:${userId}:heartbeat`, 30, Date.now());
  }

  static async removeUserOnline(userId: string) {
    await redis.srem('users:online', userId);
    return await redis.del(`user:${userId}:heartbeat`);
  }

  static async getOnlineUsers() {
    return await redis.smembers('users:online');
  }

  static async setUserSession(sessionToken: string, userData: object, ttl = 86400) {
    return await redis.setex(
      `session:${sessionToken}`,
      ttl,
      JSON.stringify(userData)
    );
  }

  static async getUserSession(sessionToken: string) {
    const data = await redis.get(`session:${sessionToken}`);
    return data ? JSON.parse(data) : null;
  }

  static async deleteUserSession(sessionToken: string) {
    return await redis.del(`session:${sessionToken}`);
  }

  static async checkRateLimit(userId: string, action: string, limit = 10, window = 60) {
    const key = `ratelimit:${userId}:${action}`;
    const current = await redis.incr(key);
    
    if (current === 1) {
      await redis.expire(key, window);
    }
    
    return current <= limit;
  }

  static async addReaction(messageId: string, userId: string, emoji: string) {
    return await redis.zadd(`reactions:${messageId}`, 1, `${userId}:${emoji}`);
  }

  static async getReactions(messageId: string) {
    return await redis.zrange(`reactions:${messageId}`, 0, -1, 'WITHSCORES');
  }

  static async addNotification(userId: string, notification: object) {
    return await redis.lpush(`notifications:${userId}`, JSON.stringify(notification));
  }

  static async getNotifications(userId: string, count = 10) {
    const notifications = await redis.lrange(`notifications:${userId}`, 0, count - 1);
    return notifications.map(n => JSON.parse(n));
  }

  static async addChatRoomLocation(roomId: string, longitude: number, latitude: number) {
    return await redis.geoadd('chatrooms', longitude, latitude, roomId);
  }

  static async findNearbyRooms(longitude: number, latitude: number, radius = 5) {
    return await redis.georadius('chatrooms', longitude, latitude, radius, 'km');
  }

  static async trackUniqueVisitor(roomId: string, userId: string) {
    const today = new Date().toISOString().split('T')[0];
    return await redis.pfadd(`visitors:${roomId}:${today}`, userId);
  }

  static async getUniqueVisitorCount(roomId: string, date?: string) {
    const targetDate = date || new Date().toISOString().split('T')[0];
    return await redis.pfcount(`visitors:${roomId}:${targetDate}`);
  }

  static async createTemporaryMessage(messageId: string, message: object, ttl = 300) {
    return await redis.setex(
      `temp:message:${messageId}`,
      ttl,
      JSON.stringify(message)
    );
  }

  static async getTemporaryMessage(messageId: string) {
    const data = await redis.get(`temp:message:${messageId}`);
    return data ? JSON.parse(data) : null;
  }
}