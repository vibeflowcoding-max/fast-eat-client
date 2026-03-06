import { NextRequest, NextResponse } from 'next/server';

export async function POST(_req: NextRequest) {
  return NextResponse.json(
    { error: 'The generic external proxy route is deprecated. Use dedicated API routes.' },
    { status: 410 },
  );
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    { error: 'The generic external proxy route is deprecated. Use dedicated API routes.' },
    { status: 410 },
  );
}
