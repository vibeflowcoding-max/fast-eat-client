import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getClientContextPayload } from '@/server/consumer/me';

export async function GET(req: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(req);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const payload = await getClientContextPayload(resolvedUser.userId);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes('No se encontró')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Context request failed' },
      { status: 500 }
    );
  }
}
