import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getLoyaltyProfileLocal } from '@/server/consumer/personalization';

function parseBearerHeader(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return header;
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = parseBearerHeader(request);
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const loyalty = await getLoyaltyProfileLocal(resolvedUser.userId);
    return NextResponse.json({ success: true, data: loyalty }, { status: 200, headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Loyalty request failed' },
      { status: 500 }
    );
  }
}
