import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { bootstrapAuthenticatedClient } from '@/server/auth/client-bootstrap';

const bootstrapSchema = z.object({
  fullName: z.string().trim().optional(),
  phone: z.string().trim().optional(),
  urlGoogleMaps: z.string().trim().optional(),
  address: z.object({
    urlAddress: z.string().trim().optional(),
    buildingType: z.string().trim().optional(),
    unitDetails: z.string().trim().optional(),
    deliveryNotes: z.string().trim().optional(),
  }).optional(),
}).partial();

export async function POST(req: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(req);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const rawBody = await req.json().catch(() => ({}));
    const parsed = bootstrapSchema.safeParse(rawBody);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid bootstrap payload' }, { status: 400 });
    }

    const payload = await bootstrapAuthenticatedClient({
      user: {
        id: resolvedUser.userId,
        email: resolvedUser.email,
        fullName: resolvedUser.fullName,
      },
      input: parsed.data,
    });

    return NextResponse.json(payload, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Client bootstrap failed';
    const status = message.includes('Unauthorized')
      ? 401
      : message.includes('Ya existe una cuenta asociada')
        ? 409
        : message.includes('Debes completar tu numero de telefono')
          ? 400
          : 500;

    return NextResponse.json(
      { error: message },
      { status }
    );
  }
}
