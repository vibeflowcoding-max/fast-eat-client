import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { listSavedCartsLocal, upsertSavedCartLocal } from '@/server/consumer/orders';

export const dynamic = 'force-dynamic';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const message = [candidate.message, candidate.details, candidate.hint, candidate.code]
      .find((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (message) {
      return message;
    }
  }

  return fallback;
}

export async function GET(request: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const branchId = request.nextUrl.searchParams.get('branchId')?.trim();
    const carts = await listSavedCartsLocal(resolvedUser.userId, branchId || undefined);

    return NextResponse.json({
      carts,
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not load saved carts') }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const body = await request.json();
    const cart = await upsertSavedCartLocal(resolvedUser.userId, body);

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not save cart') }, { status: 500 });
  }
}

export const POST = PUT;