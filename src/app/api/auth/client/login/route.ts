import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const apiUrl = process.env.FAST_EAT_API_URL;

    if (!apiUrl) {
      return NextResponse.json({ error: 'FAST_EAT_API_URL is not configured' }, { status: 500 });
    }

    const response = await fetch(`${apiUrl}/api/auth/client/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      cache: 'no-store'
    });

    const data = await response.json();
    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Client login proxy failed' },
      { status: 500 }
    );
  }
}
