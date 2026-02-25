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

    const response = await fetch(`${apiUrl}/api/consumer/v1/me/context`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Context proxy failed' },
      { status: 500 }
    );
  }
}
