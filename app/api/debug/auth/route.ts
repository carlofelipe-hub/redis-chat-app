import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest } from '@/lib/api-helpers';

export async function GET(request: NextRequest) {
  try {
    console.log('=== Auth Debug API ===');
    
    // Check cookies
    const sessionToken = request.cookies.get('session-token')?.value;
    console.log('Session token from cookies:', sessionToken ? sessionToken.slice(0, 8) + '...' : 'not found');
    
    // Try to get user
    const user = await getUserFromRequest(request);
    console.log('User from getUserFromRequest:', user);
    
    return NextResponse.json({
      hasSessionToken: !!sessionToken,
      sessionTokenPreview: sessionToken ? sessionToken.slice(0, 8) + '...' : null,
      user: user,
      userKeys: user ? Object.keys(user) : null,
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({
      error: 'Error checking auth',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}