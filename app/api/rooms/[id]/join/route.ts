import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, createUnauthorizedResponse } from '@/lib/api-helpers';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('=== Join Room API Debug ===');
    
    const user = await getUserFromRequest(request);
    console.log('User from request:', user);

    if (!user) {
      console.log('No user found, returning unauthorized');
      return createUnauthorizedResponse();
    }

    const { id: roomId } = await params;
    console.log('Room ID:', roomId);

    // Check if room exists
    console.log('Checking if room exists...');
    const room = await prisma.room.findUnique({
      where: { id: roomId },
      include: {
        _count: {
          select: {
            members: true,
          },
        },
      },
    });
    console.log('Room found:', room);

    if (!room) {
      console.log('Room not found, returning 404');
      return NextResponse.json({ error: 'Room not found' }, { status: 404 });
    }

    // Check if room is full
    if (room._count.members >= room.maxMembers) {
      return NextResponse.json({ error: 'Room is full' }, { status: 400 });
    }

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

    // Add user to room
    const membership = await prisma.roomMember.create({
      data: {
        userId: user.id,
        roomId: roomId,
        role: 'MEMBER',
      },
      include: {
        room: {
          include: {
            owner: {
              select: {
                id: true,
                username: true,
                name: true,
                avatar: true,
              },
            },
            _count: {
              select: {
                members: true,
              },
            },
          },
        },
      },
    });

    return NextResponse.json(
      { message: 'Successfully joined room', room: membership.room },
      { status: 200 }
    );
  } catch (error) {
    console.error('Join room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}