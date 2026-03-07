import { NextResponse } from 'next/server';

function getApiUrl(): string {
  const apiUrl = process.env.FAST_EAT_API_URL?.trim();
  if (!apiUrl) {
    throw new Error('FAST_EAT_API_URL is not configured');
  }

  return apiUrl.replace(/\/$/, '');
}

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const response = await fetch(`${getApiUrl()}/api/consumer/v1/profile/dietary/options`, {
      method: 'GET',
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary options proxy failed' }, { status: 500 });
  }
}