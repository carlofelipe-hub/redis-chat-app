import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function removeUserFromRoom() {
  try {
    const username = 'carlofelipe101';
    const roomId = 'general-room';

    // Find the user
    const user = await prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      console.log(`❌ User ${username} not found`);
      return;
    }

    console.log(`👤 Found user: ${user.username} (${user.id})`);

    // Check if user is a member of the room
    const membership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: roomId,
        },
      },
      include: {
        room: true,
      },
    });

    if (!membership) {
      console.log(`❌ User ${username} is not a member of ${roomId}`);
      return;
    }

    console.log(`🏠 Found membership in room: ${membership.room.name}`);
    console.log(`📝 Role: ${membership.role}`);
    console.log(`📅 Joined: ${membership.joinedAt}`);

    // Remove the membership
    await prisma.roomMember.delete({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: roomId,
        },
      },
    });

    console.log(`✅ Successfully removed ${username} from ${membership.room.name}`);

    // Show remaining members
    const remainingMembers = await prisma.roomMember.findMany({
      where: { roomId },
      include: { user: true },
    });

    console.log(`\n👥 Remaining members in ${membership.room.name}:`);
    remainingMembers.forEach(member => {
      console.log(`- ${member.user.username} (${member.role})`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

removeUserFromRoom();