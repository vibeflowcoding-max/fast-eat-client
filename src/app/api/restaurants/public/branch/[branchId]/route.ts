import { NextRequest, NextResponse } from 'next/server';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

async function loadBranchFromSupabase(branchId: string) {
  const supabaseServer = getSupabaseServer();
  const { data: branchRecord, error: branchError } = await (supabaseServer as any)
    .from('branches')
    .select(`
      id,
      name,
      address,
      phone,
      is_active,
      image_url,
      restaurant_id,
      restaurants (
        id,
        name,
        description,
        email,
        rating,
        google_maps_url,
        opening_hours,
        payment_methods,
        service_modes,
        created_at,
        updated_at
      )
    `)
    .eq('id', branchId)
    .maybeSingle();

  if (branchError) {
    throw new Error(branchError.message || 'Could not load restaurant info');
  }

  const restaurant = Array.isArray((branchRecord as any)?.restaurants)
    ? (branchRecord as any).restaurants[0]
    : (branchRecord as any)?.restaurants;

  if (!branchRecord || !restaurant) {
    return null;
  }

  return {
    id: String(branchRecord.id),
    name: String(restaurant.name || branchRecord.name || 'Restaurante'),
    description: String(restaurant.description || ''),
    category: '',
    address: String(branchRecord.address || ''),
    phone: String(branchRecord.phone || ''),
    email: String(restaurant.email || ''),
    rating: toNumber(restaurant.rating),
    image_url: String(branchRecord.image_url || ''),
    google_maps_url: String(restaurant.google_maps_url || ''),
    opening_hours: typeof restaurant.opening_hours === 'object' && restaurant.opening_hours !== null ? restaurant.opening_hours : {},
    payment_methods: Array.isArray(restaurant.payment_methods) ? restaurant.payment_methods : [],
    service_modes: Array.isArray(restaurant.service_modes) ? restaurant.service_modes : [],
    active: Boolean(branchRecord.is_active),
    created_at: String(restaurant.created_at || ''),
    updated_at: String(restaurant.updated_at || ''),
  };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ branchId: string }> },
) {
  try {
    const { branchId } = await context.params;
    const normalizedBranchId = String(branchId || '').trim();

    if (!normalizedBranchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    try {
      const { response, payload } = await fetchFastEat(
        `/restaurants/public/branch/${encodeURIComponent(normalizedBranchId)}`,
        { method: 'GET' },
      );

      if (response.ok) {
        return NextResponse.json(payload);
      }

      const fallbackData = await loadBranchFromSupabase(normalizedBranchId);
      if (fallbackData) {
        return NextResponse.json({ success: true, data: fallbackData });
      }

      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Could not load restaurant info') },
        { status: response.status },
      );
    } catch {
      const fallbackData = await loadBranchFromSupabase(normalizedBranchId);
      if (fallbackData) {
        return NextResponse.json({ success: true, data: fallbackData });
      }

      throw new Error('Could not load restaurant info');
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load restaurant info' },
      { status: 500 },
    );
  }
}