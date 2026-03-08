import { NextRequest, NextResponse } from 'next/server';
import { ensureCustomerByAuthUser } from '@/app/api/customer/_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

export interface AuthenticatedApiUser {
  token: string;
  userId: string;
  email: string | null;
  fullName: string | null;
}

export interface AuthenticatedCustomerContext extends AuthenticatedApiUser {
  customerId: string;
}

export function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  const normalizedToken = token.trim();
  return normalizedToken || null;
}

export async function resolveAuthenticatedUser(
  request: NextRequest,
): Promise<AuthenticatedApiUser | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer.auth.getUser(token);

  if (error || !data?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = data.user;
  const fullName =
    (typeof user.user_metadata?.full_name === 'string' && user.user_metadata.full_name.trim())
    || (typeof user.user_metadata?.name === 'string' && user.user_metadata.name.trim())
    || null;

  return {
    token,
    userId: user.id,
    email: user.email ?? null,
    fullName,
  };
}

export async function resolveAuthenticatedCustomer(
  request: NextRequest,
): Promise<AuthenticatedCustomerContext | NextResponse> {
  const resolvedUser = await resolveAuthenticatedUser(request);
  if (resolvedUser instanceof NextResponse) {
    return resolvedUser;
  }

  const { customerId } = await ensureCustomerByAuthUser({
    authUserId: resolvedUser.userId,
    email: resolvedUser.email,
    fullName: resolvedUser.fullName,
  });

  return {
    ...resolvedUser,
    customerId,
  };
}