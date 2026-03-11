import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { ensureCustomerByAuthUser } from '@/app/api/customer/_lib';

export const dynamic = 'force-dynamic';

async function resolveCanonicalRestaurantId(supabaseServer: ReturnType<typeof getSupabaseServer>, rawRestaurantId: string): Promise<string | null> {
  const normalizedRestaurantId = rawRestaurantId.trim();

  if (!normalizedRestaurantId) {
    return null;
  }

  const { data: restaurant, error: restaurantError } = await (supabaseServer as any)
    .from('restaurants')
    .select('id')
    .eq('id', normalizedRestaurantId)
    .maybeSingle();

  if (restaurantError) {
    throw new Error(restaurantError.message || 'Could not resolve restaurant');
  }

  if (restaurant?.id) {
    return String(restaurant.id);
  }

  const { data: branch, error: branchError } = await (supabaseServer as any)
    .from('branches')
    .select('restaurant_id')
    .eq('id', normalizedRestaurantId)
    .maybeSingle();

  if (branchError) {
    throw new Error(branchError.message || 'Could not resolve branch restaurant');
  }

  return branch?.restaurant_id ? String(branch.restaurant_id) : null;
}

function getBearerToken(request: NextRequest): string | null {
  const header = request.headers.get('authorization') || request.headers.get('Authorization');

  if (!header) {
    return null;
  }

  const [scheme, token] = header.split(' ');
  if (!scheme || !token || scheme.toLowerCase() !== 'bearer') {
    return null;
  }

  return token.trim() || null;
}

async function resolveCustomerFromToken(request: NextRequest): Promise<{ customerId: string } | NextResponse> {
  const token = getBearerToken(request);
  if (!token) {
    return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await (supabaseServer as any).auth.getUser(token);

  if (error || !data?.user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const authUser = data.user;
  const fullName =
    (typeof authUser.user_metadata?.full_name === 'string' && authUser.user_metadata.full_name) ||
    (typeof authUser.user_metadata?.name === 'string' && authUser.user_metadata.name) ||
    null;

  const { customerId } = await ensureCustomerByAuthUser({
    authUserId: authUser.id,
    email: authUser.email ?? null,
    fullName
  });

  return { customerId };
}

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveCustomerFromToken(request);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    const supabaseServer = getSupabaseServer();
    const restaurantId = request.nextUrl.searchParams.get('restaurantId')?.trim() ?? '';

    if (restaurantId) {
      const canonicalRestaurantId = await resolveCanonicalRestaurantId(supabaseServer, restaurantId);

      if (!canonicalRestaurantId) {
        return NextResponse.json({ error: 'Invalid restaurantId' }, { status: 400 });
      }

      const { data, error } = await (supabaseServer as any)
        .from('customer_favorite_restaurants')
        .select('restaurant_id')
        .eq('customer_id', resolved.customerId)
        .eq('restaurant_id', canonicalRestaurantId)
        .maybeSingle();

      if (error) {
        throw new Error(error.message || 'Could not check favorite');
      }

      return NextResponse.json({ isFavorite: Boolean(data?.restaurant_id) });
    }

    const { data, error } = await (supabaseServer as any)
      .from('customer_favorite_restaurants')
      .select('restaurant_id,created_at')
      .eq('customer_id', resolved.customerId)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message || 'Could not load favorites');
    }

    const favoriteRestaurantIds = Array.isArray(data)
      ? data.map((row) => String(row.restaurant_id)).filter(Boolean)
      : [];

    return NextResponse.json({ favoriteRestaurantIds });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load favorites' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveCustomerFromToken(request);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    const body = await request.json();
    const restaurantId = typeof body?.restaurantId === 'string' ? body.restaurantId.trim() : '';

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const canonicalRestaurantId = await resolveCanonicalRestaurantId(supabaseServer, restaurantId);

    if (!canonicalRestaurantId) {
      return NextResponse.json({ error: 'Invalid restaurantId' }, { status: 400 });
    }

    const { data: existing, error: existingError } = await (supabaseServer as any)
      .from('customer_favorite_restaurants')
      .select('restaurant_id')
      .eq('customer_id', resolved.customerId)
      .eq('restaurant_id', canonicalRestaurantId)
      .maybeSingle();

    if (existingError) {
      throw new Error(existingError.message || 'Could not verify favorite');
    }

    if (!existing) {
      const { error: insertError } = await (supabaseServer as any)
        .from('customer_favorite_restaurants')
        .insert({
          customer_id: resolved.customerId,
          restaurant_id: canonicalRestaurantId,
          updated_at: new Date().toISOString()
        });

      if (insertError) {
        throw new Error(insertError.message || 'Could not save favorite');
      }
    }

    return NextResponse.json({ success: true, isFavorite: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save favorite' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const resolved = await resolveCustomerFromToken(request);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    const restaurantId = request.nextUrl.searchParams.get('restaurantId')?.trim() ?? '';

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const canonicalRestaurantId = await resolveCanonicalRestaurantId(supabaseServer, restaurantId);

    if (!canonicalRestaurantId) {
      return NextResponse.json({ error: 'Invalid restaurantId' }, { status: 400 });
    }

    const { error } = await (supabaseServer as any)
      .from('customer_favorite_restaurants')
      .delete()
      .eq('customer_id', resolved.customerId)
      .eq('restaurant_id', canonicalRestaurantId);

    if (error) {
      throw new Error(error.message || 'Could not remove favorite');
    }

    return NextResponse.json({ success: true, isFavorite: false });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not remove favorite' },
      { status: 500 }
    );
  }
}
