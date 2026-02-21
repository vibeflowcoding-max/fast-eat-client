import { NextRequest, NextResponse } from 'next/server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string; bidId: string }> }
) {
  try {
    const { orderId, bidId } = await params;
    const FAST_EAT_API_URL = process.env.FAST_EAT_API_URL;

    if (!FAST_EAT_API_URL) {
      return NextResponse.json({ success: false, message: 'FAST_EAT_API_URL is not configured' }, { status: 500 });
    }

    const response = await fetch(`${FAST_EAT_API_URL}/api/consumer/v1/orders/${orderId}/bids/${bidId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: '{}'
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return NextResponse.json(
        { success: false, message: data?.message || 'Failed to accept bid' },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json({ success: false, message: error?.message || 'Internal server error' }, { status: 500 });
  }
}
