import type { BranchCheckoutContextPayload, BranchShellPayload, RestaurantInfo } from '@/types';
import { getSupabaseServer } from '@/lib/supabase-server';

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

async function getBranchRestaurantRecord(branchId: string): Promise<any | null> {
  const supabaseServer = getSupabaseServer();
  const { data, error } = await (supabaseServer as any)
    .from('branches')
    .select(`
      id,
      name,
      address,
      phone,
      rating,
      is_active,
      image_url,
      restaurant_id,
      google_maps_url,
      opening_hours,
      payment_methods,
      service_modes,
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

  if (error) {
    throw new Error(error.message || 'Could not load branch');
  }

  return data ?? null;
}

function resolveStringArray(primary: unknown, fallback: unknown): string[] {
  if (Array.isArray(primary) && primary.length > 0) {
    return primary.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }

  if (Array.isArray(fallback)) {
    return fallback.filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
  }

  return [];
}

function mapBranchShellRestaurant(branchRecord: any): RestaurantInfo | null {
  const restaurant = Array.isArray(branchRecord?.restaurants)
    ? branchRecord.restaurants[0]
    : branchRecord?.restaurants;

  if (!branchRecord || !restaurant) {
    return null;
  }

  return {
    id: String(restaurant.id || branchRecord.restaurant_id || branchRecord.id),
    name: String(restaurant.name || branchRecord.name || 'Restaurante'),
    description: String(restaurant.description || ''),
    category: '',
    address: String(branchRecord.address || ''),
    phone: String(branchRecord.phone || ''),
    email: String(restaurant.email || ''),
    rating: Number(branchRecord.rating ?? restaurant.rating ?? 0),
    image_url: String(branchRecord.image_url || ''),
    google_maps_url: String(branchRecord.google_maps_url || restaurant.google_maps_url || ''),
    opening_hours: typeof branchRecord.opening_hours === 'object' && branchRecord.opening_hours !== null
      ? branchRecord.opening_hours
      : typeof restaurant.opening_hours === 'object' && restaurant.opening_hours !== null
        ? restaurant.opening_hours
        : {},
    payment_methods: resolveStringArray(branchRecord.payment_methods, restaurant.payment_methods),
    service_modes: resolveStringArray(branchRecord.service_modes, restaurant.service_modes),
    active: Boolean(branchRecord.is_active),
    created_at: String(restaurant.created_at || ''),
    updated_at: String(restaurant.updated_at || ''),
  };
}

async function getBranchTableSummary(branchId: string): Promise<{ quantity: number; isAvailable: boolean }> {
  const supabaseServer = getSupabaseServer();
  const { data, error } = await (supabaseServer as any)
    .from('branch_quantity_tables')
    .select('quantity, is_available')
    .eq('branch_id', branchId)
    .maybeSingle();

  if (error) {
    return { quantity: 0, isAvailable: false };
  }

  return {
    quantity: Number(data?.quantity || 0),
    isAvailable: Boolean(data?.is_available),
  };
}

async function getBranchFeeRates(branchId: string): Promise<{ serviceFeeRate: number; platformFeeRate: number; source: string }> {
  const supabaseServer = getSupabaseServer();
  const { data, error } = await (supabaseServer as any)
    .from('fee_rules')
    .select('branch_id, service_fee, platform_fee, active, created_at')
    .or(`branch_id.eq.${branchId},branch_id.is.null`)
    .eq('active', true)
    .order('created_at', { ascending: false });

  if (error) {
    return { serviceFeeRate: 0, platformFeeRate: 0, source: 'default' };
  }

  const rows = Array.isArray(data) ? data : [];
  const matchedRule = rows.find((row: any) => row.branch_id === branchId)
    || rows.find((row: any) => !row.branch_id)
    || null;

  return {
    serviceFeeRate: toNumber(matchedRule?.service_fee),
    platformFeeRate: toNumber(matchedRule?.platform_fee),
    source: matchedRule?.branch_id ? 'branch' : matchedRule ? 'global' : 'default',
  };
}

export async function getBranchShellPayload(branchId: string): Promise<BranchShellPayload | null> {
  const branchRecord = await getBranchRestaurantRecord(branchId);
  if (!branchRecord) {
    return null;
  }

  const tableSummary = await getBranchTableSummary(branchId);

  return {
    branchId,
    restaurant: mapBranchShellRestaurant(branchRecord),
    tableQuantity: tableSummary.quantity,
    isTableAvailable: tableSummary.isAvailable,
  };
}

export async function getBranchCheckoutContextPayload(branchId: string): Promise<BranchCheckoutContextPayload | null> {
  const shell = await getBranchShellPayload(branchId);
  if (!shell) {
    return null;
  }

  const feeRates = await getBranchFeeRates(branchId);

  return {
    ...shell,
    feeRates,
  };
}