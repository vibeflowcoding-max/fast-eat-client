import { NextRequest, NextResponse } from 'next/server';

function getApiUrl(): string {
  const apiUrl = process.env.FAST_EAT_API_URL?.trim();
  if (!apiUrl) {
    throw new Error('FAST_EAT_API_URL is not configured');
  }

  return apiUrl.replace(/\/$/, '');
}

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const normalizedOrderId = String(orderId || '').trim();
    if (!normalizedOrderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    const response = await fetch(`${getApiUrl()}/api/consumer/v1/orders/${encodeURIComponent(normalizedOrderId)}/tracking`, {
      method: 'GET',
      cache: 'no-store',
      headers: { Accept: 'application/json' },
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Tracking proxy failed' }, { status: 500 });
  }
}