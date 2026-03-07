import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getMysteryBoxOffersLocal } from '@/server/consumer/personalization';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const body = await request.json().catch(() => ({}));
    const data = await getMysteryBoxOffersLocal(resolvedUser.userId, body);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mystery-box request failed' }, { status: 500 });
  }
}