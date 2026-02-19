import { NextRequest, NextResponse } from 'next/server';
import { ensureCustomerByPhone } from '@/app/api/customer/_lib';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === 'string' ? body.phone : '';
    const fullName = typeof body?.name === 'string' ? body.name : '';

    if (!phone.trim()) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    if (!fullName.trim()) {
      return NextResponse.json({ error: 'name is required' }, { status: 400 });
    }

    const { customerId } = await ensureCustomerByPhone({ phone, fullName });

    return NextResponse.json({ customerId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not save profile'
      },
      { status: 500 }
    );
  }
}
