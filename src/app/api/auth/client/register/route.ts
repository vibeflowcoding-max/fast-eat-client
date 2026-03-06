import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8),
  fullName: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid registration payload' }, { status: 400 });
    }

    const { response, payload } = await fetchFastEat('/api/auth/client/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(parsed.data),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Client register proxy failed') },
        { status: response.status },
      );
    }

    return NextResponse.json(payload, { status: response.status });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Client register proxy failed' },
      { status: 500 }
    );
  }
}
