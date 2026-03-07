import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { getDietaryProfileLocal, upsertDietaryProfileLocal } from '@/server/consumer/personalization';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const profile = await getDietaryProfileLocal(resolvedUser.userId);
    return NextResponse.json({ success: true, data: { profile } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary request failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const body = await request.json().catch(() => ({}));
    const profile = await upsertDietaryProfileLocal(resolvedUser.userId, body);
    return NextResponse.json({ success: true, data: { profile } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary request failed' }, { status: 500 });
  }
}