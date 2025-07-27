# WebSocket Server Deployment on Coolify

Since Soketi isn't working, here are 3 better alternatives for real-time messaging:

## Option 1: Deploy Custom Socket.io Server (Recommended)

### Step 1: Create WebSocket Application in Coolify

1. **Create New Application** in Coolify:
   - Name: `redis-chat-websocket`
   - Source: Same Git Repository
   - Build Pack: `Dockerfile`
   - Dockerfile: `websocket.Dockerfile`

2. **Set Port Configuration**:
   - Port: `8080`
   - Health Check: `/health`

3. **Environment Variables**:
```env
# Redis Connection (use internal service names)
REDIS_URL=redis://default:YOUR_REDIS_PASSWORD@redis-chat-redis:6379

# CORS Configuration
CORS_ORIGIN=https://your-main-app-domain.com

# Server Config
NODE_ENV=production
PORT=8080
```

4. **Domain Setup**:
   - Add subdomain: `ws.your-domain.com`
   - Enable SSL

### Step 2: Update Main App Environment

Add to your main app's environment variables:
```env
NEXT_PUBLIC_WEBSOCKET_URL=wss://ws.your-domain.com
```

### Step 3: Deploy Both Services

1. Deploy WebSocket server first
2. Deploy main app
3. Test real-time messaging

---

## Option 2: Next.js API Routes + Server-Sent Events

For simpler setup, use Server-Sent Events instead of WebSocket:

### Create SSE Endpoint

```typescript
// app/api/chat/events/route.ts
export async function GET(request: NextRequest) {
  const stream = new ReadableStream({
    start(controller) {
      // Set up Redis subscription
      // Send events to client
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Client Setup

```typescript
// lib/sse-client.ts
export function subscribeToMessages(roomId: string, onMessage: (data: any) => void) {
  const eventSource = new EventSource(`/api/chat/events?roomId=${roomId}`);
  eventSource.onmessage = (event) => {
    onMessage(JSON.parse(event.data));
  };
  return eventSource;
}
```

---

## Option 3: Use Ably (External Service)

If you want a managed solution:

1. **Sign up for Ably** (free tier available)
2. **Install Ably SDK**:
```bash
npm install ably
```

3. **Configure Ably**:
```typescript
// lib/ably.ts
import Ably from 'ably/promises';

export const ably = new Ably.Realtime(process.env.ABLY_API_KEY);

export function subscribeToRoom(roomId: string, callback: (message: any) => void) {
  const channel = ably.channels.get(`room:${roomId}`);
  channel.subscribe('message', callback);
  return channel;
}
```

---

## Recommended Approach

**Go with Option 1 (Custom Socket.io)** because:
- ✅ Full control over the server
- ✅ Uses your existing Redis infrastructure  
- ✅ No external dependencies
- ✅ Can be hosted entirely on your Coolify VPS
- ✅ Most scalable solution

## Quick Setup Commands

```bash
# 1. Commit current changes
git add .
git commit -m "Add WebSocket server configuration"
git push origin main

# 2. In Coolify:
# - Create new application
# - Use websocket.Dockerfile
# - Set environment variables
# - Deploy

# 3. Update main app environment
# - Add NEXT_PUBLIC_WEBSOCKET_URL
# - Redeploy main app
```

Would you like me to help you set up any of these options?