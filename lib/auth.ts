import bcrypt from 'bcryptjs';
import { prisma } from './prisma';
import { RedisOperations } from './redis';
import { UserSession } from './types';

export async function hashPassword(password: string): Promise<string> {
  return await bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return await bcrypt.compare(password, hashedPassword);
}

export function generateSessionToken(): string {
  return crypto.randomUUID();
}

export async function createSession(userId: string): Promise<string> {
  const sessionToken = generateSessionToken();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  await prisma.session.create({
    data: {
      token: sessionToken,
      userId,
      expiresAt,
    },
  });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, username: true, email: true, name: true, avatar: true },
  });

  if (user) {
    await RedisOperations.setUserSession(sessionToken, user, 86400);
  }

  return sessionToken;
}

export async function getSessionUser(sessionToken: string): Promise<UserSession | null> {
  try {
    const userData = await RedisOperations.getUserSession(sessionToken);
    if (userData) {
      return userData;
    }

    const session = await prisma.session.findUnique({
      where: { token: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date()) {
      return null;
    }

    const userSession: UserSession = {
      id: session.user.id,
      username: session.user.username,
      email: session.user.email,
      name: session.user.name || undefined,
      avatar: session.user.avatar || undefined,
    };

    await RedisOperations.setUserSession(sessionToken, userSession, 86400);

    return userSession;
  } catch (error) {
    console.error('Error getting session user:', error);
    return null;
  }
}

export async function deleteSession(sessionToken: string): Promise<void> {
  await Promise.all([
    prisma.session.delete({
      where: { token: sessionToken },
    }).catch(() => {}),
    RedisOperations.deleteUserSession(sessionToken),
  ]);
}