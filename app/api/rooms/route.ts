import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest, createUnauthorizedResponse } from '@/lib/api-helpers';

const createRoomSchema = z.object({
  name: z.string().min(1, 'Room name is required').max(50, 'Room name must be less than 50 characters'),
  description: z.string().optional(),
  isPrivate: z.boolean().default(false),
  maxMembers: z.number().min(2).max(1000).default(100),
});

export async function GET(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return createUnauthorizedResponse();
    }

    const rooms = await prisma.room.findMany({
      where: {
        OR: [
          { isPrivate: false },
          {
            members: {
              some: {
                userId: user.id,
              },
            },
          },
        ],
      },
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
      orderBy: {
        updatedAt: 'desc',
      },
    });

    return NextResponse.json({ rooms }, { status: 200 });
  } catch (error) {
    console.error('Get rooms error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getUserFromRequest(request);

    if (!user) {
      return createUnauthorizedResponse();
    }

    const body = await request.json();
    const validatedData = createRoomSchema.parse(body);

    const room = await prisma.room.create({
      data: {
        name: validatedData.name,
        description: validatedData.description,
        isPrivate: validatedData.isPrivate,
        maxMembers: validatedData.maxMembers,
        ownerId: user.id,
        members: {
          create: {
            userId: user.id,
            role: 'OWNER',
          },
        },
      },
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
    });

    return NextResponse.json(
      { message: 'Room created successfully', room },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation failed', details: error.issues },
        { status: 400 }
      );
    }

    console.error('Create room error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}