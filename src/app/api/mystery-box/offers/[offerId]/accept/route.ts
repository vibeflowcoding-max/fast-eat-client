import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { acceptMysteryBoxOfferLocal } from '@/server/consumer/personalization';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ offerId: string }> }) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const { offerId } = await context.params;
    const data = await acceptMysteryBoxOfferLocal(resolvedUser.userId, offerId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Mystery-box accept request failed' }, { status: 500 });
  }
}