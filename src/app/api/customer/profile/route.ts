import { NextRequest, NextResponse } from 'next/server';
import { ensureCustomerByPhone, findCustomerByPhone } from '@/app/api/customer/_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')?.trim() ?? '';

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const customer = await findCustomerByPhone(phone);

    if (!customer || !customer.id) {
      return NextResponse.json({
        profile: null,
        favoriteRestaurants: []
      });
    }

    const customerId = String(customer.id);

    const [{ data: addressData }, { data: dietaryData }, { data: persistedFavorites }, { data: favoriteData }] = await Promise.all([
      (supabaseServer as any)
        .from('customer_address')
        .select('url_address,building_type,unit_details,delivery_notes,updated_at')
        .eq('customer_id', customerId)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      (supabaseServer as any)
        .from('user_dietary_profiles')
        .select('allergies,preferences,strictness')
        .eq('user_id', customerId)
        .limit(1)
        .maybeSingle(),
      (supabaseServer as any)
        .from('customer_favorite_restaurants')
        .select('restaurant_id,created_at')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(20),
      (supabaseServer as any)
        .from('orders_with_details')
        .select('restaurant_id')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .limit(50)
    ]);

    let topRestaurantIds = ((persistedFavorites ?? []) as Array<{ restaurant_id: string | null }>)
      .map((row) => row.restaurant_id)
      .filter((restaurantId): restaurantId is string => typeof restaurantId === 'string' && restaurantId.length > 0)
      .slice(0, 6);

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

    const fallbackName =
      (typeof customer.full_name === 'string' && customer.full_name.trim()) ||
      (typeof customer.name === 'string' && customer.name.trim()) ||
      (typeof customer.customer_name === 'string' && customer.customer_name.trim()) ||
      null;

    const profile = {
      customerId,
      fullName: fallbackName,
      phone,
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
