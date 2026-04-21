import { NextRequest, NextResponse } from 'next/server';
import { resolveAuthenticatedCustomer } from '@/app/api/_lib/auth';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const resolved = await resolveAuthenticatedCustomer(request);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    const supabaseServer = getSupabaseServer();

    const [{ data: addressData }, { data: dietaryData }, { data: persistedFavorites }, { data: favoriteData }] = await Promise.all([
      (supabaseServer as any)
        .from('customer_address')
        .select('url_address,building_type,unit_details,delivery_notes,updated_at')
        .eq('customer_id', resolved.customerId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabaseServer as any)
        .from('user_dietary_profiles')
        .select('allergies,preferences,strictness')
        .eq('user_id', resolved.customerId)
        .limit(1)
        .maybeSingle(),
      (supabaseServer as any)
        .from('customer_favorite_restaurants')
        .select('restaurant_id,created_at')
        .eq('customer_id', resolved.customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      (supabaseServer as any)
        .from('orders_with_details')
        .select('restaurant_id')
        .eq('customer_id', resolved.customerId)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    // ⚡ Bolt: Replaced chained .map().filter().slice() with a single-pass loop
    // This avoids multiple intermediate array allocations and redundant O(N) iterations.
    let topRestaurantIds: string[] = [];
    for (const row of (persistedFavorites ?? []) as Array<{ restaurant_id: string | null }>) {
      if (typeof row.restaurant_id === 'string' && row.restaurant_id.length > 0) {
        topRestaurantIds.push(row.restaurant_id);
        if (topRestaurantIds.length === 6) {
          break;
        }
      }
    }

    if (topRestaurantIds.length === 0) {
      const restaurantFrequency = new Map<string, number>();
      for (const row of (favoriteData ?? []) as Array<{ restaurant_id: string | null }>) {
        if (!row.restaurant_id) {
          continue;
        }

        restaurantFrequency.set(row.restaurant_id, (restaurantFrequency.get(row.restaurant_id) ?? 0) + 1);
      }

      topRestaurantIds = [...restaurantFrequency.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([restaurantId]) => restaurantId);
    }

    let favoriteRestaurants: Array<{ id: string; name: string; logo_url: string | null }> = [];

    if (topRestaurantIds.length > 0) {
      const { data: restaurants } = await (supabaseServer as any)
        .from('restaurants')
        .select('id,name,logo_url')
        .in('id', topRestaurantIds);

      const byId = new Map<string, { id: string; name: string; logo_url: string | null }>();

      for (const restaurant of (restaurants ?? []) as Array<{ id: string; name: string; logo_url: string | null }>) {
        byId.set(restaurant.id, restaurant);
      }

      favoriteRestaurants = topRestaurantIds
        .map((restaurantId) => byId.get(restaurantId))
        .filter(Boolean) as Array<{ id: string; name: string; logo_url: string | null }>;
    }

    const profile = {
      customerId: resolved.customerId,
      fullName: resolved.fullName,
      phone: null,
      address: addressData?.url_address ?? null,
      buildingType: addressData?.building_type ?? null,
      unitDetails: addressData?.unit_details ?? null,
      deliveryNotes: addressData?.delivery_notes ?? null,
      allergies: Array.isArray(dietaryData?.allergies) ? dietaryData.allergies : [],
      dietaryPreferences: Array.isArray(dietaryData?.preferences) ? dietaryData.preferences : [],
      dietaryStrictness: dietaryData?.strictness ?? null
    };

    return NextResponse.json({ profile, favoriteRestaurants });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not fetch profile'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const resolved = await resolveAuthenticatedCustomer(request);
    if (resolved instanceof NextResponse) {
      return resolved;
    }

    return NextResponse.json({ customerId: resolved.customerId });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not save profile'
      },
      { status: 500 }
    );
  }
}
