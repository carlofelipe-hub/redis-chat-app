import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import ChatInterface from '@/components/chat/ChatInterface';

export default async function ChatRoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session-token')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const user = await getSessionUser(sessionToken);

  if (!user) {
    redirect('/login');
  }

  const { roomId } = await params;

  // Check if room exists and user has access
  const room = await prisma.room.findFirst({
    where: {
      id: roomId,
      OR: [
        { isPrivate: false },
        {
          members: {
            some: {
              userId: user.userId,
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
        },
      },
      members: {
        include: {
          user: {
            select: {
              id: true,
              username: true,
              name: true,
              avatar: true,
            },
          },
        },
      },
      _count: {
        select: {
          members: true,
        },
      },
    },
  });

  if (!room) {
    redirect('/chat');
  }

  // Get all available rooms for sidebar
  const allRooms = await prisma.room.findMany({
    where: {
      OR: [
        { isPrivate: false },
        {
          members: {
            some: {
              userId: user.userId,
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

  return (
    <ChatInterface
      user={user}
      currentRoom={room}
      allRooms={allRooms}
    />
  );
}