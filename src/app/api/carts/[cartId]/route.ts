import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedUser } from '@/app/api/_lib/auth';
import { archiveSavedCartLocal, getSavedCartLocal } from '@/server/consumer/orders';

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

export async function GET(request: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const { cartId } = await params;
    const cart = await getSavedCartLocal(resolvedUser.userId, cartId);

    return NextResponse.json({ cart });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not load saved cart') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  try {
    const resolvedUser = await resolveAuthenticatedUser(request);
    if (resolvedUser instanceof NextResponse) {
      return resolvedUser;
    }

    const { cartId } = await params;
    await archiveSavedCartLocal(resolvedUser.userId, cartId);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not archive saved cart') }, { status: 500 });
  }
}