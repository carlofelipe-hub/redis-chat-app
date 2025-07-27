const { createServer } = require('http');
const { Server } = require('socket.io');
const Redis = require('ioredis');

// Load environment variables
require('dotenv').config();

const httpServer = createServer();
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || ["http://localhost:3000", "https://*.proximacentauri.solutions"],
    methods: ["GET", "POST"],
    credentials: true
  }
});

// Create Redis clients for pub/sub
const redis = new Redis(process.env.REDIS_URL);
const subscriber = new Redis(process.env.REDIS_URL);

console.log('🚀 WebSocket server starting...');
console.log('Redis URL:', process.env.REDIS_URL ? 'Connected' : 'Not configured');

// Track connected users
const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('👤 User connected:', socket.id);

  // Handle user joining a room
  socket.on('join-room', async (data) => {
    const { roomId, userId, username } = data;
    console.log(`🏠 User ${username} joining room ${roomId}`);
    
    // Leave any previous rooms
    const rooms = Array.from(socket.rooms).filter(room => room !== socket.id);
    rooms.forEach(room => socket.leave(room));
    
    // Join the new room
    socket.join(roomId);
    
    // Track user info
    connectedUsers.set(socket.id, { userId, username, roomId });
    
    // Add user to Redis online set
    await redis.sadd('users:online', userId);
    await redis.setex(`user:${userId}:heartbeat`, 30, Date.now());
    
    // Subscribe to room messages if not already subscribed
    const channelKey = `chat:${roomId}`;
    if (!subscriber.listenerCount(channelKey)) {
      await subscriber.subscribe(channelKey);
    }
    
    // Notify room that user joined
    socket.to(roomId).emit('user-joined', {
      userId,
      username,
      timestamp: Date.now()
    });
    
    console.log(`✅ User ${username} joined room ${roomId}`);
  });

  // Handle user leaving a room
  socket.on('leave-room', async (data) => {
    const { roomId, userId, username } = data;
    console.log(`🚪 User ${username} leaving room ${roomId}`);
    
    socket.leave(roomId);
    
    // Notify room that user left
    socket.to(roomId).emit('user-left', {
      userId,
      username,
      timestamp: Date.now()
    });
  });

  // Handle sending messages
  socket.on('send-message', async (data) => {
    const { roomId, message } = data;
    const userInfo = connectedUsers.get(socket.id);
    
    if (!userInfo) {
      console.log('❌ User not found for socket:', socket.id);
      return;
    }
    
    console.log(`💬 Message from ${userInfo.username} in ${roomId}`);
    
    try {
      // Store message in Redis Stream
      await redis.xadd(
        `messages:${roomId}`,
        '*',
        'userId', message.userId,
        'text', message.text,
        'timestamp', message.timestamp,
        'type', message.type || 'TEXT'
      );
      
      // Publish to Redis for other server instances
      await redis.publish(`chat:${roomId}`, JSON.stringify(message));
      
      console.log(`✅ Message stored and published for room ${roomId}`);
      
    } catch (error) {
      console.error('❌ Error handling message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing indicators
  socket.on('typing-start', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', {
      userId,
      username,
      isTyping: true,
      timestamp: Date.now()
    });
  });

  socket.on('typing-stop', (data) => {
    const { roomId, userId, username } = data;
    socket.to(roomId).emit('user-typing', {
      userId,
      username,
      isTyping: false,
      timestamp: Date.now()
    });
  });

  // Handle disconnect
  socket.on('disconnect', async () => {
    console.log('👋 User disconnected:', socket.id);
    
    const userInfo = connectedUsers.get(socket.id);
    if (userInfo) {
      const { userId, username, roomId } = userInfo;
      
      // Remove from online users if no other connections
      const userSockets = Array.from(connectedUsers.entries())
        .filter(([socketId, info]) => info.userId === userId && socketId !== socket.id);
      
      if (userSockets.length === 0) {
        await redis.srem('users:online', userId);
        await redis.del(`user:${userId}:heartbeat`);
        
        // Notify room that user went offline
        if (roomId) {
          socket.to(roomId).emit('user-left', {
            userId,
            username,
            timestamp: Date.now()
          });
        }
      }
      
      connectedUsers.delete(socket.id);
    }
  });
});

// Handle Redis pub/sub messages
subscriber.on('message', (channel, message) => {
  console.log(`📨 Redis message on ${channel}`);
  
  try {
    const parsedMessage = JSON.parse(message);
    const roomId = channel.replace('chat:', '');
    
    // Broadcast to all connected clients in the room
    io.to(roomId).emit('new-message', parsedMessage);
    
  } catch (error) {
    console.error('❌ Error parsing Redis message:', error);
  }
});

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      status: 'ok', 
      connectedUsers: connectedUsers.size,
      timestamp: Date.now()
    }));
  } else {
    res.writeHead(404);
    res.end('Not found');
  }
});

const PORT = process.env.PORT || process.env.WEBSOCKET_PORT || 8080;

// Health check endpoint
httpServer.on('request', (req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', timestamp: new Date().toISOString() }));
  }
});

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 WebSocket server running on port ${PORT}`);
  console.log(`📊 Health check available at http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('🛑 Shutting down WebSocket server...');
  
  // Clean up Redis connections
  await redis.quit();
  await subscriber.quit();
  
  // Close server
  httpServer.close(() => {
    console.log('✅ WebSocket server closed');
    process.exit(0);
  });
});