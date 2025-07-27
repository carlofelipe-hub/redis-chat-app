import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getUserFromRequest } from '@/lib/api-helpers';

export async function POST(request: NextRequest) {
  try {
    console.log('=== Debug Join Test ===');
    
    // Test 1: Check if we can get user from request
    console.log('1. Getting user from request...');
    const user = await getUserFromRequest(request);
    console.log('User:', user);
    
    if (!user) {
      return NextResponse.json({ error: 'No user found', step: 1 }, { status: 401 });
    }

    // Test 2: Check if we can query the database
    console.log('2. Testing database connection...');
    const testUser = await prisma.user.findUnique({
      where: { id: user.id },
    });
    console.log('Test user query result:', testUser);

    // Test 3: Check if general room exists
    console.log('3. Checking general room...');
    const room = await prisma.room.findUnique({
      where: { id: 'general-room' },
    });
    console.log('Room query result:', room);

    // Test 4: Check existing membership
    console.log('4. Checking existing membership...');
    const existingMember = await prisma.roomMember.findUnique({
      where: {
        userId_roomId: {
          userId: user.id,
          roomId: 'general-room',
        },
      },
    });
    console.log('Existing membership:', existingMember);

    // Test 5: Try to create membership
    console.log('5. Attempting to create membership...');
    const membership = await prisma.roomMember.create({
      data: {
        userId: user.id,
        roomId: 'general-room',
        role: 'MEMBER',
      },
    });
    console.log('Membership created:', membership);

    return NextResponse.json({ 
      success: true, 
      user, 
      room, 
      membership,
      message: 'All tests passed!' 
    });

  } catch (error) {
    console.error('Debug join test error:', error);
    return NextResponse.json(
      { 
        error: 'Debug test failed', 
        details: error instanceof Error ? error.message : 'Unknown error',
        stack: error instanceof Error ? error.stack : null
      },
      { status: 500 }
    );
  }
}