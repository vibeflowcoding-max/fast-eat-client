import { NextRequest, NextResponse } from 'next/server';
import { confirmDeliveryLocal } from '@/server/consumer/orders';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string }> }
) {
  try {
    const { orderId } = await params;
    const data = await confirmDeliveryLocal(orderId);
    return NextResponse.json({ success: true, data }, { status: 200 });
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal server error' }, { status: 500 });
  }
}
