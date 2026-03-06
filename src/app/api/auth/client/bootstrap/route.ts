import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';

const bootstrapSchema = z.object({
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  urlGoogleMaps: z.string().trim().optional(),
}).partial();

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = bootstrapSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bootstrap payload' }, { status: 400 });
    }

    const { response, payload } = await fetchFastEat('/api/auth/client/bootstrap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authHeader,
      },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Client bootstrap proxy failed') },
        { status: response.status },
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Client bootstrap proxy failed' },
      { status: 500 }
    );
  }
}
