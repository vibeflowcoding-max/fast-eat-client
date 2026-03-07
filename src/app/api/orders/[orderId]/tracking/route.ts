import { NextRequest, NextResponse } from 'next/server';
import { getOrderTrackingLocal } from '@/server/consumer/orders';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const data = await getOrderTrackingLocal(normalizedOrderId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tracking request failed' }, { status: 500 });
  }
}