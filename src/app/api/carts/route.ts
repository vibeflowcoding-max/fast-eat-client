import { NextRequest, NextResponse } from 'next/server';
import { buildFastEatApiUrl } from '@/app/api/_lib/fast-eat-api';
import { getBearerToken } from '@/app/api/_lib/auth';

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

function getAuthorizationHeader(request: NextRequest): string {
  const token = getBearerToken(request);
  if (!token) {
    throw new Error('Missing Authorization header');
  }

  return `Bearer ${token}`;
}

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId')?.trim();
    const url = new URL(buildFastEatApiUrl('/api/consumer/v1/carts'));
    if (branchId) {
      url.searchParams.set('branchId', branchId);
    }

    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Authorization: getAuthorizationHeader(request),
      },
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Could not load saved carts'));
    }

    return NextResponse.json({
      carts: Array.isArray(data?.data?.carts) ? data.data.carts : [],
    });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not load saved carts') }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const response = await fetch(buildFastEatApiUrl('/api/consumer/v1/carts'), {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: getAuthorizationHeader(request),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(getErrorMessage(data, 'Could not save cart'));
    }

    return NextResponse.json({ cart: data?.data?.cart ?? null });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error, 'Could not save cart') }, { status: 500 });
  }
}

export const POST = PUT;