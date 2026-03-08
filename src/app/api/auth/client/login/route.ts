import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loginClientWithSupabase } from '@/server/auth/client-auth';

const loginSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = loginSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid login payload' }, { status: 400 });
    }

    const payload = await loginClientWithSupabase(parsed.data);

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client login failed';
    const status = message.includes('Email o contrasena incorrectos') || message.includes('No se pudo establecer sesion')
      ? 401
      : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
