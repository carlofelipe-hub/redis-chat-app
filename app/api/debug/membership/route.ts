import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);
    
    if (!user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user's memberships
    const memberships = await prisma.roomMember.findMany({
      where: { userId: user.id },
      include: {
        room: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // Get user details
    const userDetails = await prisma.user.findUnique({
      where: { id: user.id },
      select: {
        id: true,
        username: true,
        email: true,
        name: true,
      },
    });

    return NextResponse.json({
      user: userDetails,
      sessionUser: user,
      memberships: memberships.map(m => ({
        roomId: m.roomId,
        roomName: m.room.name,
        role: m.role,
        joinedAt: m.joinedAt,
      })),
    });
  } catch (error) {
    console.error('Debug membership error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}