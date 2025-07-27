import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export default async function ChatPage() {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get('session-token')?.value;

  if (!sessionToken) {
    redirect('/login');
  }

  const user = await getSessionUser(sessionToken);

  if (!user) {
    redirect('/login');
  }

  // Get user's rooms
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

  // Redirect to the first room if any, otherwise to general room
  const defaultRoom = rooms.find(r => r.id === 'general-room') || rooms[0];

  if (defaultRoom) {
    redirect(`/chat/${defaultRoom.id}`);
  }

  return (
    <div className="flex h-screen items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">No Chat Rooms Available</h1>
        <p className="text-muted-foreground">
          There are no available chat rooms at the moment.
        </p>
      </div>
    </div>
  );
}