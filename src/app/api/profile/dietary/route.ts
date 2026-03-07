import { NextRequest, NextResponse } from 'next/server';

function getApiUrl(): string {
  const apiUrl = process.env.FAST_EAT_API_URL?.trim();
  if (!apiUrl) {
    throw new Error('FAST_EAT_API_URL is not configured');
  }

  return apiUrl.replace(/\/$/, '');
}

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const response = await fetch(`${getApiUrl()}/api/consumer/v1/profile/dietary`, {
      method: 'GET',
      headers: { Authorization: authHeader },
      cache: 'no-store',
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary proxy failed' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const response = await fetch(`${getApiUrl()}/api/consumer/v1/profile/dietary`, {
      method: 'PUT',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary proxy failed' }, { status: 500 });
  }
}