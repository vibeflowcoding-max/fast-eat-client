import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    const apiUrl = process.env.FAST_EAT_API_URL;

    if (!apiUrl) {
      return NextResponse.json({ error: 'FAST_EAT_API_URL is not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    const response = await fetch(`${apiUrl}/api/consumer/v1/me/context`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Context proxy timed out' },
        { status: 504 },
      );
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Context proxy failed' },
      { status: 500 }
    );
  }
}
