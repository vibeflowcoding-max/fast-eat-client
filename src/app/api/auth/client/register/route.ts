import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { registerClientWithSupabase } from '@/server/auth/client-auth';

const registerSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(6),
  fullName: z.string().trim().min(2).optional(),
  name: z.string().trim().min(2).optional(),
  phone: z.string().trim().min(1).optional(),
  address: z.object({
    urlAddress: z.string().trim().optional(),
    buildingType: z.string().trim().optional(),
    unitDetails: z.string().trim().optional(),
    deliveryNotes: z.string().trim().optional(),
  }).optional(),
});

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = registerSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid registration payload' }, { status: 400 });
    }

    const fullName = parsed.data.fullName ?? parsed.data.name ?? '';
    const phone = parsed.data.phone ?? '';

    if (!fullName.trim()) {
      return NextResponse.json({ error: 'fullName is required' }, { status: 400 });
    }

    if (!phone.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const payload = await registerClientWithSupabase({
      email: parsed.data.email,
      password: parsed.data.password,
      fullName,
      phone,
      address: parsed.data.address,
    });

    return NextResponse.json(payload, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client register failed';
    const status = message.includes('Este email ya existe')
      ? 409
      : message.includes('Ya existe una cuenta asociada')
        ? 409
        : message.includes('Error en registro de cliente')
          ? 400
          : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
