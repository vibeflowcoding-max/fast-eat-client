import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const apiUrl = process.env.FAST_EAT_API_URL;

    if (!apiUrl) {
      return NextResponse.json({ error: 'FAST_EAT_API_URL is not configured' }, { status: 500 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));

    const response = await fetch(`${apiUrl}/api/auth/client/bootstrap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Client bootstrap proxy failed' },
      { status: 500 }
    );
  }
}
