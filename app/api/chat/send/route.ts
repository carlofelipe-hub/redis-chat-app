import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-helpers';
import { broadcastToRoom } from '@/lib/pusher-server';
import { redis } from '@/lib/redis';
import { z } from 'zod';

const sendMessageSchema = z.object({
  roomId: z.string(),
  text: z.string().min(1, 'Message cannot be empty').max(1000, 'Message too long'),
  type: z.enum(['TEXT', 'IMAGE', 'FILE']).default('TEXT'),
});

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { roomId, text, type } = sendMessageSchema.parse(body);

    // Create message object
    const message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      username: user.username,
      avatar: user.avatar,
      text,
      type,
      timestamp: Date.now(),
    };

    // Store message in Redis Streams for history
    await redis.xadd(
      `messages:${roomId}`,
      '*',
      'userId', message.userId,
      'username', message.username,
      'avatar', message.avatar || '',
      'text', message.text,
      'type', message.type,
      'timestamp', message.timestamp.toString()
    );

    // Broadcast message to room via Soketi
    await broadcastToRoom(roomId, 'new-message', message);

    return NextResponse.json({ 
      success: true, 
      message: 'Message sent successfully',
      data: message 
    });

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