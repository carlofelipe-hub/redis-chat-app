import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { RedisOperations } from '@/lib/redis';
import { getUserFromRequest, createUnauthorizedResponse } from '@/lib/api-helpers';

const sendMessageSchema = z.object({
  text: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== Messages GET API ===');
    
    const user = await getUserFromRequest(request);
    console.log('User from request:', user ? `${user.username} (${user.id})` : 'null');
    console.log('Full user object:', JSON.stringify(user, null, 2));

    if (!user || !user.id) {
      console.log('No user found or user.id missing, returning 401');
      console.log('User object keys:', user ? Object.keys(user) : 'user is null');
      return createUnauthorizedResponse();
    }

    const { id: roomId } = await params;
    console.log('Room ID:', roomId);

    // Check if user is a member of the room
    console.log('Checking membership for user:', user.id, 'room:', roomId);
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: roomId,
        },
      },
    });

    console.log('Membership found:', !!membership);
    if (membership) {
      console.log('Membership details:', membership.role, membership.joinedAt);
    }

    if (!membership) {
      console.log('No membership found, returning 403');
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
    }

    // Get recent messages from Redis Stream
    console.log('Fetching messages from Redis stream for room:', roomId);
    let recentMessages: [string, string[]][] = [];
    try {
      recentMessages = await RedisOperations.getRecentMessages(roomId, 50);
      console.log('Redis messages fetched:', recentMessages.length);
    } catch (error) {
      console.log('Redis stream error (stream might not exist yet):', error instanceof Error ? error.message : 'Unknown error');
      recentMessages = []; // Return empty array if stream doesn't exist
    }

    // Convert Redis stream format to our message format
    const messages = recentMessages.map((entry) => {
      const [id, fields] = entry;
      const fieldObj: Record<string, string> = {};
      for (let i = 0; i < fields.length; i += 2) {
        fieldObj[fields[i]] = fields[i + 1];
      }

      return {
        id,
        userId: fieldObj.userId,
        text: fieldObj.text,
        timestamp: parseInt(fieldObj.timestamp),
        type: fieldObj.type || 'TEXT',
      };
    });

    // Get user information for the messages
    const userIds = [...new Set(messages.map(m => m.userId))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, username: true, name: true, avatar: true },
    });

    const userMap = new Map(users.map(u => [u.id, u]));

    const enrichedMessages = messages.map(message => ({
      ...message,
      username: userMap.get(message.userId)?.username || 'Unknown',
      avatar: userMap.get(message.userId)?.avatar,
    }));

    return NextResponse.json({ messages: enrichedMessages }, { status: 200 });
  } catch (error) {
    console.error('Get messages error:', error);
    console.error('Error details:', error instanceof Error ? error.message : error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return createUnauthorizedResponse();
    }

    const { id: roomId } = await params;

    // Check if user is a member of the room
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: roomId,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: 'Not a member of this room' }, { status: 403 });
    }

    const body = await request.json();
    const validatedData = sendMessageSchema.parse(body);

    // Check rate limit
    const canSend = await RedisOperations.checkRateLimit(user.id, 'send_message', 20, 60);
    if (!canSend) {
      return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
    }

    const messageId = crypto.randomUUID();
    const timestamp = Date.now();

    // Add message to Redis Stream
    await RedisOperations.addMessageToStream(roomId, user.id, validatedData.text);

    // Publish message for real-time delivery
    const message = {
      id: messageId,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      text: validatedData.text,
      timestamp,
      type: validatedData.type,
    };

    await RedisOperations.publishMessage(roomId, message);

    // Track unique visitor
    await RedisOperations.trackUniqueVisitor(roomId, user.id);

    return NextResponse.json(
      { message: 'Message sent successfully', data: message },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Send message error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}