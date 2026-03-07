import { NextRequest, NextResponse } from 'next/server';
import { buildFastEatApiUrl } from '@/app/api/_lib/fast-eat-api';
import { getBearerToken } from '@/app/api/_lib/auth';

export const dynamic = 'force-dynamic';

function getAuthorizationHeader(request: NextRequest): string {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error('Missing Authorization header');
  }

  return `Bearer ${token}`;
}

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
    const { cartId } = await params;
    const response = await fetch(buildFastEatApiUrl(`/api/consumer/v1/carts/${encodeURIComponent(cartId)}`), {
      method: 'GET',
      headers: {
        Authorization: getAuthorizationHeader(request),
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Could not load saved cart'));
    }

    return NextResponse.json({ cart: data?.data?.cart ?? null });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not load saved cart') }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ cartId: string }> }) {
  try {
    const { cartId } = await params;
    const response = await fetch(buildFastEatApiUrl(`/api/consumer/v1/carts/${encodeURIComponent(cartId)}`), {
      method: 'DELETE',
      headers: {
        Authorization: getAuthorizationHeader(request),
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Could not archive saved cart'));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not archive saved cart') }, { status: 500 });
  }
}