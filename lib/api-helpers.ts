import { NextRequest } from 'next/server';
import { getSessionUser } from './auth';
import { UserSession } from './types';

export async function getUserFromRequest(request: NextRequest): Promise<UserSession | null> {
  const sessionToken = request.cookies.get('session-token')?.value;
  
  if (!sessionToken) {
    return null;
  }

  return await getSessionUser(sessionToken);
}

export function createUnauthorizedResponse() {
  return Response.json({ error: 'Unauthorized' }, { status: 401 });
}