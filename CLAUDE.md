# Redis Real-Time Chat Application

A comprehensive weekend project to learn Redis through building a feature-rich real-time chat application with Next.js.

## Project Overview

This project demonstrates Redis's full capabilities through a real-time chat application that showcases various Redis data structures and patterns. The application is designed to be deployed on Coolify with separate Redis and PostgreSQL instances.

## Tech Stack

- **Frontend**: Next.js 15 (App Router), Socket.io-client, Tailwind CSS, shadcn/ui
- **Backend**: Next.js API routes + Node.js WebSocket server
- **Primary Database**: Redis (for all real-time features)
- **Secondary Database**: PostgreSQL with Prisma ORM (user authentication & persistent data)
- **Real-time**: Socket.io with Redis adapter
- **UI Components**: shadcn/ui (Radix UI + Tailwind)
- **Database GUI**: TablePlus
- **Deployment**: Coolify (self-hosted VPS)

## Redis Features Demonstrated

### 1. **Pub/Sub** - Real-time Messaging

- Publishing messages to channels
- Subscribing to multiple channels
- Pattern-based subscriptions

### 2. **Streams** - Message History

- Storing messages with automatic IDs
- Range queries for pagination
- Consumer groups for message delivery

### 3. **Sets** - User Presence

- Tracking online users
- Set operations for user states
- Atomic add/remove operations

### 4. **Sorted Sets** - Rankings & Reactions

- Message reactions with scores
- Trending topics
- User activity leaderboards

### 5. **Geo** - Location Features

- Find nearby chat rooms
- Distance calculations
- Radius queries

### 6. **HyperLogLog** - Analytics

- Unique visitor counting
- Memory-efficient cardinality estimation

### 7. **Strings with TTL** - Rate Limiting & Sessions

- API rate limiting
- Session management
- Temporary data storage

### 8. **Lists** - Notifications

- User notification queues
- Recent activity feeds
- FIFO/LIFO operations

### 9. **Hashes** - User Profiles

- Structured user data
- Partial updates
- Field-level operations

### 10. **Transactions & Lua Scripts**

- Atomic operations
- Complex logic execution
- Performance optimization

## Project Structure

```
redis-chat-app/
├── apps/
│   ├── web/                    # Next.js application
│   │   ├── app/
│   │   │   ├── api/           # API routes
│   │   │   ├── chat/          # Chat pages
│   │   │   └── layout.tsx
│   │   ├── components/
│   │   ├── hooks/             # Custom React hooks
│   │   ├── lib/
│   │   │   ├── redis/         # Redis client and operations
│   │   │   ├── prisma/        # Prisma client instance
│   │   │   └── socket/        # Socket.io client
│   │   └── prisma/
│   │       ├── schema.prisma  # Database schema
│   │       └── migrations/    # Database migrations
│   │
│   └── websocket-server/       # Separate WebSocket server
│       ├── src/
│       │   ├── handlers/      # Socket event handlers
│       │   ├── redis/         # Redis pub/sub setup
│       │   └── index.ts
│       └── package.json
│
├── packages/
│   ├── database/              # Shared Prisma schema & client
│   ├── redis-client/          # Shared Redis client config
│   ├── types/                 # Shared TypeScript types
│   └── utils/                 # Shared utilities
│
└── package.json               # Monorepo root
```

## Environment Variables

### For Coolify Deployment

```env
# Redis Connection (from Coolify)
REDIS_URL=redis://default:your-redis-password@your-coolify-redis-service:6379
REDIS_PASSWORD=your-redis-password

# PostgreSQL Connection (from Coolify) - for Prisma
DATABASE_URL=postgresql://postgres:your-postgres-password@your-coolify-postgres-service:5432/chatdb?schema=public

# Direct Database URL (for migrations in Coolify)
DIRECT_URL=postgresql://postgres:your-postgres-password@your-coolify-postgres-service:5432/chatdb?schema=public

# Next.js
NEXTAUTH_URL=https://your-app-domain.com
NEXTAUTH_SECRET=your-secret-key

# WebSocket Server
WEBSOCKET_URL=wss://your-websocket-domain.com
```

## Prisma Schema

```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  username      String    @unique
  password      String
  name          String?
  avatar        String?
  bio           String?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  rooms         RoomMember[]
  ownedRooms    Room[]

  @@index([email])
  @@index([username])
}

model Room {
  id            String    @id @default(cuid())
  name          String
  description   String?
  isPrivate     Boolean   @default(false)
  maxMembers    Int       @default(100)
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  // Relations
  ownerId       String
  owner         User      @relation(fields: [ownerId], references: [id])
  members       RoomMember[]

  @@index([ownerId])
}

model RoomMember {
  id            String    @id @default(cuid())
  joinedAt      DateTime  @default(now())
  role          Role      @default(MEMBER)

  // Relations
  userId        String
  user          User      @relation(fields: [userId], references: [id])
  roomId        String
  room          Room      @relation(fields: [roomId], references: [id])

  @@unique([userId, roomId])
  @@index([userId])
  @@index([roomId])
}

enum Role {
  OWNER
  ADMIN
  MEMBER
}
```

## TablePlus Configuration

### Connecting to Coolify Databases

1. **PostgreSQL Connection**

   ```
   Name: Coolify PostgreSQL
   Host: your-vps-ip
   Port: [exposed-postgres-port]
   User: postgres
   Password: [your-postgres-password]
   Database: chatdb
   ```

2. **Redis Connection**
   ```
   Name: Coolify Redis
   Host: your-vps-ip
   Port: [exposed-redis-port]
   Password: [your-redis-password]
   ```

### Useful TablePlus Queries for Development

```sql
-- View all users and their room memberships
SELECT
  u.username,
  u.email,
  r.name as room_name,
  rm.role,
  rm."joinedAt"
FROM "User" u
LEFT JOIN "RoomMember" rm ON u.id = rm."userId"
LEFT JOIN "Room" r ON rm."roomId" = r.id
ORDER BY u.username, r.name;

-- Get room statistics
SELECT
  r.name,
  r."isPrivate",
  COUNT(rm.id) as member_count,
  r."createdAt"
FROM "Room" r
LEFT JOIN "RoomMember" rm ON r.id = rm."roomId"
GROUP BY r.id
ORDER BY member_count DESC;
```

## Core Features Implementation

### Day 1 - Essential Features

#### 1. Real-time Messaging (Pub/Sub)

```javascript
// Publish message
await redis.publish(`chat:${roomId}`, JSON.stringify(message));

// Subscribe to room
await redis.subscribe(`chat:${roomId}`);

// Store message metadata in PostgreSQL
await prisma.message.create({
  data: {
    id: messageId,
    roomId,
    userId,
    createdAt: new Date(),
  },
});
```

#### 2. User Presence (Sets)

```javascript
// User comes online
await redis.sadd("users:online", userId);
await redis.setex(`user:${userId}:heartbeat`, 30, Date.now());

// Get online users with details from PostgreSQL
const onlineUserIds = await redis.smembers("users:online");
const users = await prisma.user.findMany({
  where: { id: { in: onlineUserIds } },
  select: { id: true, username: true, avatar: true },
});
```

#### 3. Message History (Streams + PostgreSQL)

```javascript
// Add message to Redis stream for real-time
await redis.xadd(
  `messages:${roomId}`,
  "*",
  "userId",
  userId,
  "text",
  text,
  "timestamp",
  Date.now()
);

// Store in PostgreSQL for persistence
await prisma.message.create({
  data: {
    roomId,
    userId,
    content: text,
    type: "TEXT",
  },
});

// Read recent messages from Redis
const recentMessages = await redis.xrange(
  `messages:${roomId}`,
  "-",
  "+",
  "COUNT",
  50
);

// Load older messages from PostgreSQL
const olderMessages = await prisma.message.findMany({
  where: { roomId },
  orderBy: { createdAt: "desc" },
  take: 100,
  include: { user: true },
});
```

#### 4. Session Management with Prisma

```javascript
// Create session
const session = await prisma.session.create({
  data: {
    token: sessionToken,
    userId,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
  },
});

// Store in Redis for fast access
await redis.setex(
  `session:${sessionToken}`,
  86400, // 24 hours
  JSON.stringify({ userId, username: user.username })
);
```

#### 5. Rate Limiting with Tracking

```javascript
// Check rate limit
const key = `ratelimit:${userId}:${endpoint}`;
const current = await redis.incr(key);
if (current === 1) {
  await redis.expire(key, 60); // 1 minute window
}

if (current > 10) {
  // Log rate limit violation in PostgreSQL
  await prisma.rateLimitViolation.create({
    data: { userId, endpoint, timestamp: new Date() },
  });
  throw new Error("Rate limit exceeded");
}
```

### Day 2 - Advanced Features

#### 6. Message Reactions (Sorted Sets)

```javascript
// Add reaction
await redis.zadd(`reactions:${messageId}`, 1, `${userId}:${emoji}`);

// Get reaction counts
const reactions = await redis.zrange(
  `reactions:${messageId}`,
  0,
  -1,
  "WITHSCORES"
);
```

#### 7. Notifications (Lists)

```javascript
// Add notification
await redis.lpush(`notifications:${userId}`, JSON.stringify(notification));

// Get recent notifications
const notifications = await redis.lrange(`notifications:${userId}`, 0, 9);
```

#### 8. Geolocation Chat Rooms

```javascript
// Add chat room with location
await redis.geoadd("chatrooms", longitude, latitude, roomId);

// Find nearby rooms (5km radius)
const nearbyRooms = await redis.georadius(
  "chatrooms",
  userLon,
  userLat,
  5,
  "km"
);
```

#### 9. Analytics (HyperLogLog)

```javascript
// Track unique visitors
await redis.pfadd(`visitors:${roomId}:${today}`, userId);

// Get unique visitor count
const count = await redis.pfcount(`visitors:${roomId}:${today}`);
```

#### 10. Disappearing Messages (TTL)

```javascript
// Create temporary message
await redis.setex(
  `temp:message:${messageId}`,
  300, // 5 minutes
  JSON.stringify(message)
);
```

## Next.js 15 Specific Features

### Using Turbopack

Next.js 15 includes Turbopack for faster development builds:

```json
// package.json
{
  "scripts": {
    "dev": "next dev --turbopack",
    "build": "next build",
    "start": "next start"
  }
}
```

### Server Components with Redis

```typescript
// app/chat/[roomId]/page.tsx
import { redis } from "@/lib/redis";
import { prisma } from "@/lib/prisma";

// This is a Server Component by default in Next.js 15
export default async function ChatRoom({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  // Note: params is now a Promise in Next.js 15
  const { roomId } = await params;

  // Fetch room data from PostgreSQL
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: { members: true },
  });

  // Get recent messages from Redis
  const recentMessages = await redis.xrange(
    `messages:${roomId}`,
    "-",
    "+",
    "COUNT",
    50
  );

  return <ChatRoomClient room={room} initialMessages={recentMessages} />;
}
```

### API Routes with Route Handlers

```typescript
// app/api/chat/send/route.ts
import { NextRequest } from "next/server";
import { redis } from "@/lib/redis";

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Publish to Redis
  await redis.publish(
    `chat:${body.roomId}`,
    JSON.stringify({
      userId: body.userId,
      message: body.message,
      timestamp: Date.now(),
    })
  );

  return Response.json({ success: true });
}
```

### Core Chat Components with shadcn/ui

```tsx
// components/chat/ChatMessage.tsx
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// components/chat/ChatInput.tsx
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

// components/chat/UserList.tsx
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// components/chat/RoomSelector.tsx
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

// components/layout/Header.tsx
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
```

### Theme Configuration

```typescript
// app/layout.tsx
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "sonner";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-center" />
        </ThemeProvider>
      </body>
    </html>
  );
}
```

### Using Sonner for Notifications

```typescript
// Example usage in components
import { toast } from "sonner";

// Success notification
toast.success("Message sent successfully!");

// Error notification
toast.error("Failed to connect to chat room");

// Loading state
const promise = sendMessage(message);
toast.promise(promise, {
  loading: "Sending message...",
  success: "Message sent!",
  error: "Failed to send message",
});

// Custom notification with action
toast("New message from Alice", {
  action: {
    label: "View",
    onClick: () => navigateToMessage(),
  },
});
```

### Sample Chat Interface Layout

```tsx
// app/chat/[roomId]/page.tsx
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function ChatRoom() {
  return (
    <div className="flex h-screen">
      {/* Sidebar */}
      <aside className="w-64 border-r">
        <Card className="h-full rounded-none border-0">
          <CardHeader>
            <CardTitle>Chat Rooms</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              {/* Room list */}
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col">
        {/* Chat Header */}
        <Card className="rounded-none border-0 border-b">
          <CardHeader className="py-3">
            <div className="flex items-center justify-between">
              <CardTitle>General Chat</CardTitle>
              <CardDescription>128 online</CardDescription>
            </div>
          </CardHeader>
        </Card>

        {/* Messages */}
        <ScrollArea className="flex-1 p-4">{/* Messages list */}</ScrollArea>

        {/* Input */}
        <Card className="rounded-none border-0 border-t">
          <CardContent className="p-4">
            <form className="flex gap-2">
              <Input placeholder="Type a message..." className="flex-1" />
              <Button type="submit">Send</Button>
            </form>
          </CardContent>
        </Card>
      </main>

      {/* Right Sidebar - Online Users */}
      <aside className="w-64 border-l">
        <Card className="h-full rounded-none border-0">
          <CardHeader>
            <CardTitle>Online Users</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[calc(100vh-8rem)]">
              {/* User list */}
            </ScrollArea>
          </CardContent>
        </Card>
      </aside>
    </div>
  );
}
```

### Authentication

- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout

### Chat Operations

- `GET /api/rooms` - List available rooms
- `POST /api/rooms` - Create new room
- `GET /api/rooms/[id]/messages` - Get message history
- `POST /api/rooms/[id]/messages` - Send message (HTTP fallback)

### User Operations

- `GET /api/users/online` - Get online users
- `GET /api/users/[id]/profile` - Get user profile
- `PUT /api/users/[id]/profile` - Update profile

### Analytics

- `GET /api/analytics/visitors` - Unique visitor stats
- `GET /api/analytics/messages` - Message statistics

## WebSocket Events

### Client → Server

- `join-room` - Join a chat room
- `leave-room` - Leave a chat room
- `send-message` - Send a message
- `typing-start` - User started typing
- `typing-stop` - User stopped typing
- `add-reaction` - Add reaction to message

### Server → Client

- `user-joined` - User joined room
- `user-left` - User left room
- `new-message` - New message received
- `user-typing` - User is typing
- `reaction-added` - Reaction added to message
- `presence-update` - Online/offline status change

## Redis Data Structure Reference

### Keys Pattern

```
# Users
users:online                    SET      - Online user IDs
user:{id}:profile              HASH     - User profile data
user:{id}:heartbeat            STRING   - Last activity timestamp
user:{id}:sessions             SET      - Active session IDs

# Messages
messages:{roomId}              STREAM   - Message history
temp:message:{id}              STRING   - Disappearing messages
reactions:{messageId}          ZSET     - Message reactions

# Rooms
rooms:{id}:info                HASH     - Room metadata
rooms:{id}:members             SET      - Room members
chatrooms                      GEO      - Room locations

# Notifications
notifications:{userId}         LIST     - User notifications

# Rate Limiting
ratelimit:{userId}:{action}    STRING   - Rate limit counter

# Analytics
visitors:{roomId}:{date}       HLL      - Unique visitors
stats:messages:{date}          HASH     - Message statistics

# Sessions
session:{sessionId}            STRING   - Session data
```

## Deployment on Coolify

### Prerequisites

1. Redis instance deployed on Coolify
2. PostgreSQL instance deployed on Coolify
3. Domain configured for the application
4. SSH access to your VPS

### Database Setup in Coolify

1. **PostgreSQL Configuration**

   - Create a new PostgreSQL service in Coolify
   - Note the internal service name (e.g., `postgres-chatapp`)
   - Set a strong password
   - Create database: `chatdb`

2. **Redis Configuration**

   - Create a new Redis service in Coolify
   - Enable persistence (AOF or RDB)
   - Set a strong password
   - Note the internal service name (e.g., `redis-chatapp`)

3. **Environment Variables in Coolify**
   ```env
   # Use Coolify internal service names
   DATABASE_URL=postgresql://postgres:your-password@postgres-chatapp:5432/chatdb
   DIRECT_URL=postgresql://postgres:your-password@postgres-chatapp:5432/chatdb
   REDIS_URL=redis://default:your-password@redis-chatapp:6379
   ```

### Deployment Steps

1. **Prepare Application**

   ```bash
   # Build Prisma schema
   npx prisma generate

   # Create production build
   npm run build
   ```

2. **Database Migrations**

   - Option 1: Run migrations as part of build process

   ```dockerfile
   # In your Dockerfile
   RUN npx prisma migrate deploy
   ```

   - Option 2: Run manually after deployment

   ```bash
   # SSH into container
   npx prisma migrate deploy
   ```

3. **Configure Coolify Application**

   - Set build command: `npm run build`
   - Set start command: `npm run start`
   - Add all environment variables
   - Configure health checks

4. **Post-Deployment Verification**

   ```bash
   # Check PostgreSQL tables via TablePlus
   # Verify all Prisma migrations applied

   # Check Redis connection
   redis-cli ping

   # Monitor application logs in Coolify
   ```

## Development Workflow

### Initial Setup

1. **Create Next.js 15 Project**

```bash
# Create a new Next.js 15 app
npx create-next-app@latest redis-chat-app --typescript --tailwind --app

# Answer the prompts:
# - Would you like to use ESLint? → Yes
# - Would you like to use Turbopack for next dev? → Yes
# - Would you like to customize the import alias? → No

# Navigate to project
cd redis-chat-app
```

2. **Install Dependencies**

```bash
# Core dependencies
npm install @prisma/client prisma
npm install ioredis
npm install socket.io socket.io-client
npm install bcryptjs
npm install next-auth@beta  # For Next.js 15 compatibility
npm install zod
npm install react-hook-form @hookform/resolvers

# Type definitions
npm install -D @types/bcryptjs
```

3. **Setup shadcn/ui**

```bash
# Initialize shadcn/ui
npx shadcn@latest init

# Answer the prompts:
# - Which style would you like to use? → New York
# - Which color would you like to use as the base color? → Zinc
# - Would you like to use CSS variables for theming? → Yes

# Install essential shadcn/ui components
npx shadcn@latest add button
npx shadcn@latest add input
npx shadcn@latest add card
npx shadcn@latest add avatar
npx shadcn@latest add badge
npx shadcn@latest add dialog
npx shadcn@latest add dropdown-menu
npx shadcn@latest add scroll-area
npx shadcn@latest add separator
npx shadcn@latest add tooltip
npx shadcn@latest add form
npx shadcn@latest add popover
npx shadcn@latest add command
npx shadcn@latest add sheet
npx shadcn@latest add sonner
```

4. **Configure Prisma**

```bash
# Initialize Prisma
npx prisma init

# Generate Prisma Client
npx prisma generate

# Create initial migration
npx prisma migrate dev --name init
```

3. **Connect to Coolify Databases via SSH Tunnel**

```bash
# SSH tunnel for PostgreSQL (for local development)
ssh -L 5432:localhost:5432 your-vps-user@your-vps-ip

# SSH tunnel for Redis (for local development)
ssh -L 6379:localhost:6379 your-vps-user@your-vps-ip
```

### Local Development

```bash
# Pull database schema from Coolify PostgreSQL
npx prisma db pull

# Run database migrations
npx prisma migrate dev

# Generate Prisma types
npx prisma generate

# Open Prisma Studio (visual database editor)
npx prisma studio

# Start development servers
npm run dev
```

### Database Management with Prisma

```bash
# Create a new migration
npx prisma migrate dev --name add_user_fields

# Apply migrations to production (Coolify)
npx prisma migrate deploy

# Reset database (CAREFUL - development only)
npx prisma migrate reset

# Seed database with test data
npx prisma db seed
```

### Testing Redis Commands

```bash
# Connect to Redis CLI via TablePlus or terminal
redis-cli -h your-coolify-redis-host -p 6379 -a your-password

# Monitor all Redis commands (debugging)
MONITOR

# Check specific keys
KEYS user:*

# Test Pub/Sub
SUBSCRIBE chat:room1
```

## Performance Considerations

1. **Connection Pooling**: Use Redis connection pool for better performance
2. **Pipelining**: Batch Redis commands when possible
3. **Lua Scripts**: Use for complex atomic operations
4. **Expiration**: Set TTL on temporary data to prevent memory bloat
5. **Pub/Sub**: Use pattern subscriptions carefully (performance impact)

## Security Best Practices

1. **Authentication**: Always use Redis AUTH in production
2. **Encryption**: Use TLS for Redis connections
3. **Validation**: Validate all inputs before Redis operations
4. **Rate Limiting**: Implement on all API endpoints
5. **Sanitization**: Sanitize user inputs to prevent injection

## Monitoring & Debugging

### Redis Monitoring Commands

```bash
# Memory usage
INFO memory

# Connected clients
CLIENT LIST

# Slow queries
SLOWLOG GET 10

# Current operations
MONITOR
```

### Application Metrics to Track

- Message throughput
- Active connections
- Memory usage
- Cache hit rate
- Response times

## Next Steps & Extensions

1. **Add Redis Search**: Full-text message search
2. **Redis TimeSeries**: Message analytics over time
3. **Redis Graph**: User relationship mapping
4. **Clustering**: Scale with Redis Cluster
5. **Persistence**: Configure RDB/AOF appropriately

## Resources

- [Redis Documentation](https://redis.io/documentation)
- [Redis Best Practices](https://redis.io/docs/manual/patterns/)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Prisma with Redis](https://www.prisma.io/docs/guides/performance-and-optimization/caching)
- [Socket.io with Redis](https://socket.io/docs/v4/redis-adapter/)
- [Next.js Documentation](https://nextjs.org/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/docs)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Coolify Documentation](https://coolify.io/docs)
- [TablePlus Documentation](https://docs.tableplus.com)

## Sample Prisma Seed File

```typescript
// prisma/seed.ts
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const alice = await prisma.user.create({
    data: {
      email: "alice@example.com",
      username: "alice",
      password: await bcrypt.hash("password123", 10),
      name: "Alice Johnson",
    },
  });

  const bob = await prisma.user.create({
    data: {
      email: "bob@example.com",
      username: "bob",
      password: await bcrypt.hash("password123", 10),
      name: "Bob Smith",
    },
  });

  // Create test room
  const generalRoom = await prisma.room.create({
    data: {
      name: "General Chat",
      description: "A place for general discussions",
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: "OWNER" },
          { userId: bob.id, role: "MEMBER" },
        ],
      },
    },
  });

  console.log({ alice, bob, generalRoom });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

Add to package.json:

```json
{
  "prisma": {
    "seed": "ts-node --compiler-options {\"module\":\"CommonJS\"} prisma/seed.ts"
  }
}
```
