import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { saveOrderSplitLocal } from '@/server/consumer/orders';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const { orderId } = await context.params;
    const body = await request.json().catch(() => ({}));
    const split = await saveOrderSplitLocal(orderId, resolvedUser.userId, body);
    return NextResponse.json({ success: true, data: { split } }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Split request failed' }, { status: 500 });
  }
}