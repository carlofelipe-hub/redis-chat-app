import { PrismaClient } from '../lib/generated/prisma';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create test users
  const alice = await prisma.user.upsert({
    where: { email: 'alice@example.com' },
    update: {},
    create: {
      email: 'alice@example.com',
      username: 'alice',
      password: await bcrypt.hash('password123', 10),
      name: 'Alice Johnson',
    },
  });

  const bob = await prisma.user.upsert({
    where: { email: 'bob@example.com' },
    update: {},
    create: {
      email: 'bob@example.com',
      username: 'bob',
      password: await bcrypt.hash('password123', 10),
      name: 'Bob Smith',
    },
  });

  // Create test room
  const generalRoom = await prisma.room.upsert({
    where: { id: 'general-room' },
    update: {},
    create: {
      id: 'general-room',
      name: 'General Chat',
      description: 'A place for general discussions',
      ownerId: alice.id,
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  console.log({ alice, bob, generalRoom });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });