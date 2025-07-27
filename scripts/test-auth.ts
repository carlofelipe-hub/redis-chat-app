import dotenv from 'dotenv';
import { prisma } from '../lib/prisma';

// Load environment variables
dotenv.config();

async function testAuth() {
  try {
    console.log('Testing authentication...');
    
    // Find your user
    const user = await prisma.user.findUnique({
      where: { username: 'carlofelipe101' }
    });
    
    if (!user) {
      console.log('❌ User not found');
      return;
    }
    
    console.log('✅ User found:', user.username, 'ID:', user.id);
    
    // Find any active sessions for this user
    const sessions = await prisma.session.findMany({
      where: { 
        userId: user.id,
        expiresAt: { gt: new Date() }
      }
    });
    
    console.log('Active sessions found:', sessions.length);
    
    if (sessions.length > 0) {
      console.log('Latest session token (partial):', sessions[0].token.slice(0, 8) + '...');
      console.log('Session expires:', sessions[0].expiresAt);
    } else {
      console.log('No active sessions found');
      
      // Create a new session for testing
      console.log('Creating new session...');
      const sessionToken = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
      
      await prisma.session.create({
        data: {
          token: sessionToken,
          userId: user.id,
          expiresAt,
        },
      });
      
      console.log('✅ New session created:', sessionToken.slice(0, 8) + '...');
      console.log('You can set this in your browser cookies as "session-token"');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testAuth();