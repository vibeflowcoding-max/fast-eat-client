import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getTraceId } from '@/app/api/discovery/_lib';
import { getClientBootstrapPayload } from '@/server/consumer/me';

export async function GET(req: NextRequest) {
  const traceId = getTraceId(req.headers.get('x-trace-id'));

  try {
    const resolvedUser = await resolveAuthenticatedUser(req);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const payload = await getClientBootstrapPayload(resolvedUser.userId);
    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
        'x-trace-id': traceId,
      },
    });
  } catch (error) {
    console.error('[consumer.me.bootstrap.error]', {
      traceId,
      error: error instanceof Error ? error.message : 'Bootstrap request failed',
    });

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Bootstrap request failed', traceId },
      { status: 500 },
    );
  }
}