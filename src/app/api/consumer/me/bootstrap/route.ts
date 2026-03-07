import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getClientBootstrapPayload } from '@/server/consumer/me';

export async function GET(req: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(req);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const payload = await getClientBootstrapPayload(resolvedUser.userId);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bootstrap request failed' },
      { status: 500 },
    );
  }
}