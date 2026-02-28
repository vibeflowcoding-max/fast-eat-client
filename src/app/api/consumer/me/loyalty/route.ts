import { NextRequest, NextResponse } from 'next/server';

function parseBearerHeader(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');
  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return header;
}

export async function GET(request: NextRequest) {
  try {
    const apiUrl = process.env.FAST_EAT_API_URL;
    if (!apiUrl) {
      return NextResponse.json({ error: 'FAST_EAT_API_URL is not configured' }, { status: 500 });
    }

    const authHeader = parseBearerHeader(request);
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const response = await fetch(`${apiUrl}/api/consumer/me/loyalty`, {
      method: 'GET',
      headers: {
        Authorization: authHeader,
      },
      cache: 'no-store',
    });

    const body = await response.text();
    const payload = body ? JSON.parse(body) : {};

    return NextResponse.json(payload, {
      status: response.status,
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Loyalty proxy failed' },
      { status: 500 }
    );
  }
}
