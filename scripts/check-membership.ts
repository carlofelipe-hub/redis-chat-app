import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function checkMembership() {
  try {
    // Find the user carlofelipe101
    const user = await prisma.user.findUnique({
      where: { username: 'carlofelipe101' },
      include: {
        rooms: {
          include: {
            room: true,
          },
        },
      },
    });

    if (!user) {
      console.log('❌ User carlofelipe101 not found');
      return;
    }

    console.log('✅ User found:');
    console.log(`ID: ${user.id}`);
    console.log(`Username: ${user.username}`);
    console.log(`Email: ${user.email}`);
    console.log(`Name: ${user.name}`);

    console.log('\n📋 Room memberships:');
    if (user.rooms.length === 0) {
      console.log('❌ User is not a member of any rooms');
    } else {
      user.rooms.forEach(membership => {
        console.log(`- ${membership.room.name} (${membership.room.id}) - Role: ${membership.role}`);
      });
    }

    // Check general room specifically
    const generalRoomMembership = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: 'general-room',
        },
      },
      include: {
        room: true,
      },
    });

    console.log('\n🏠 General room membership:');
    if (generalRoomMembership) {
      console.log('✅ User IS a member of general-room');
      console.log(`Role: ${generalRoomMembership.role}`);
      console.log(`Joined: ${generalRoomMembership.joinedAt}`);
    } else {
      console.log('❌ User is NOT a member of general-room');
    }

    // Check all general room members
    console.log('\n👥 All general room members:');
    const generalRoomMembers = await prisma.roomMember.findMany({
      where: { roomId: 'general-room' },
      include: { user: true },
    });

    generalRoomMembers.forEach(member => {
      console.log(`- ${member.user.username} (${member.user.id}) - ${member.role}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMembership();