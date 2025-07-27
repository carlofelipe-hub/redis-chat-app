import { PrismaClient } from '../lib/generated/prisma';

const prisma = new PrismaClient();

async function addUserToGeneral() {
  try {
    // Find users who are not in the general room
    const users = await prisma.user.findMany({
      where: {
        NOT: {
          rooms: {
            some: {
              roomId: 'general-room',
            },
          },
        },
      },
    });

    console.log(`Found ${users.length} users not in general room:`);
    users.forEach(user => console.log(`- ${user.username} (${user.email})`));

    // Add all these users to the general room
    for (const user of users) {
      try {
        await prisma.roomMember.create({
          data: {
            userId: user.id,
            roomId: 'general-room',
            role: 'MEMBER',
          },
        });
        console.log(`✅ Added ${user.username} to general room`);
      } catch (error) {
        console.log(`❌ Failed to add ${user.username}:`, error);
      }
    }

    console.log('\n🎉 All users have been added to the general room!');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addUserToGeneral();