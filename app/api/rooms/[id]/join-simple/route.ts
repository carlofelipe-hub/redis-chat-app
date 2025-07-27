import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== Simple Join Room API ===');
    
    // Get session token from cookies
    const sessionToken = request.cookies.get('session-token')?.value;
    console.log('Session token found:', !!sessionToken);
    
    if (!sessionToken) {
      return NextResponse.json({ error: 'No session token' }, { status: 401 });
    }

    // Get user from database session
    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });
    
    console.log('Session found:', !!session);
    
    if (!session || session.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Invalid or expired session' }, { status: 401 });
    }

    const user = session.user;
    console.log('User:', user.username);

    const { id: roomId } = await params;
    console.log('Room ID:', roomId);

    // Check if room exists
    const room = await prisma.room.findUnique({
      where: { id: roomId },
    });
    
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    console.log('Room found:', room.name);

    // Check if user is already a member
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: roomId,
        },
      },
    });

    if (existingMember) {
      return NextResponse.json({ error: 'Already a member of this room' }, { status: 400 });
    }

    console.log('User is not a member, adding...');

    // Add user to room
    const membership = await prisma.roomMember.create({
      data: {
        userId: user.id,
        roomId: roomId,
        role: 'MEMBER',
      },
    });

    console.log('Membership created successfully');

    return NextResponse.json(
      { message: 'Successfully joined room', membership },
      { status: 200 }
    );

  } catch (error) {
    console.error('Simple join room error:', error);
    return NextResponse.json(
      { 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}