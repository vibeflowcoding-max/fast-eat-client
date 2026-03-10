import type { ClientBootstrapPayload } from '@/types';
import { getSupabaseServer } from '@/lib/supabase-server';

export interface ConsumerClientContextPayload {
  profile: {
    authUserId: string;
    userProfile: {
      user_id: string;
      email: string | null;
      full_name: string | null;
      phone: string | null;
      url_google_maps: string | null;
      role_id?: string | null;
      is_online?: boolean | null;
      subscription_status?: string | null;
    } | null;
    customer: {
      id: string;
      auth_user_id: string | null;
      name: string | null;
      phone: string | null;
      email: string | null;
      address?: string | null;
    } | null;
    primaryAddress: {
      id: string;
      customer_id: string;
      url_address: string | null;
      building_type: string | null;
      unit_details: string | null;
      delivery_notes: string | null;
    } | null;
  };
  favorites: string[];
  recentSearches: Array<{
    id: string;
    query: string;
    created_at: string;
  }>;
  orderHistorySummary: {
    total: number;
    recent: Array<{
      id: string;
      restaurant_id: string | null;
      total: number | null;
      created_at: string;
      status_id: string | null;
      delivery_address: string | null;
    }>;
  };
  settings: {
    shareActivity: boolean;
    dietaryProfile: Record<string, unknown> | null;
  };
}

interface BootstrapProfileRow {
  user_id: string;
  email: string | null;
  full_name: string | null;
  phone: string | null;
  url_google_maps: string | null;
}

interface ContextProfileRow extends BootstrapProfileRow {
  role_id: string | null;
  is_online: boolean | null;
  subscription_status: string | null;
}

interface CustomerRow {
  id: string;
  auth_user_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  address?: string | null;
}

interface CustomerAddressRow {
  id: string;
  customer_id: string;
  url_address: string | null;
  building_type: string | null;
  unit_details: string | null;
  delivery_notes: string | null;
  lat?: number | null;
  lng?: number | null;
  formatted_address?: string | null;
  place_id?: string | null;
}

interface RecentOrderRow {
  id: string;
  restaurant_id: string | null;
  total: number | null;
  created_at: string;
  status_id: string | null;
  delivery_address: string | null;
}

interface RecentSearchRow {
  id: string;
  query: string;
  created_at: string;
}

interface SocialSettingsRow {
  share_activity: boolean | null;
}

function getMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  if (error && typeof error === 'object') {
    const message = 'message' in error ? error.message : null;
    if (typeof message === 'string' && message.length > 0) {
      return message;
    }

    const details = 'details' in error ? error.details : null;
    if (typeof details === 'string' && details.length > 0) {
      return details;
    }
  }

  return fallback;
}

function logBootstrapWarning(scope: string, userId: string, error: unknown) {
  console.warn(`[consumer.bootstrap.${scope}]`, {
    userId,
    error: getMessage(error, `consumer.bootstrap.${scope}`),
  });
}

export async function getClientBootstrapPayload(userId: string): Promise<ClientBootstrapPayload> {
  const supabaseServer = getSupabaseServer();

  const [{ data: userProfile, error: profileError }, { data: customer, error: customerError }] = await Promise.all([
    (supabaseServer as any)
      .from('user_profiles')
      .select('user_id, email, full_name, phone, url_google_maps')
      .eq('user_id', userId)
      .maybeSingle(),
    (supabaseServer as any)
      .from('customers')
      .select('id, auth_user_id, name, phone, email, address')
      .eq('auth_user_id', userId)
      .maybeSingle(),
  ]);

  if (profileError) {
    logBootstrapWarning('profile_query_failed', userId, profileError);
  }

  if (customerError) {
    logBootstrapWarning('customer_query_failed', userId, customerError);
  }

  const typedProfile = profileError ? null : (userProfile ?? null) as BootstrapProfileRow | null;
  const typedCustomer = customerError ? null : (customer ?? null) as CustomerRow | null;

  const { data: address, error: addressError } = typedCustomer?.id
    ? await (supabaseServer as any)
        .from('customer_address')
        .select('id, customer_id, url_address, building_type, unit_details, delivery_notes')
        .eq('customer_id', typedCustomer.id)
        .order('updated_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    : { data: null, error: null };

  if (addressError) {
    logBootstrapWarning('address_query_failed', userId, addressError);
  }

  const typedAddress = addressError ? null : (address ?? null) as CustomerAddressRow | null;
  const fullName = typedProfile?.full_name || typedCustomer?.name || null;
  const phone = typedProfile?.phone || typedCustomer?.phone || null;
  const urlGoogleMaps = typedProfile?.url_google_maps || null;

  return {
    authUserId: userId,
    customerId: typedCustomer?.id || null,
    profile: {
      userId,
      email: typedProfile?.email || typedCustomer?.email || null,
      fullName,
      phone,
      urlGoogleMaps,
    },
    customer: typedCustomer
      ? {
          id: typedCustomer.id,
          name: typedCustomer.name,
          phone: typedCustomer.phone,
          email: typedCustomer.email || null,
        }
      : null,
    primaryAddress: typedAddress
      ? {
          id: typedAddress.id,
          customerId: typedAddress.customer_id,
          urlAddress: typedAddress.url_address,
          buildingType: typedAddress.building_type || 'Other',
          unitDetails: typedAddress.unit_details || null,
          deliveryNotes: typedAddress.delivery_notes || '',
          lat: typeof typedAddress.lat === 'number' ? typedAddress.lat : null,
          lng: typeof typedAddress.lng === 'number' ? typedAddress.lng : null,
          formattedAddress: typedAddress.formatted_address || typedAddress.url_address || null,
          placeId: typedAddress.place_id || null,
        }
      : null,
    completion: {
      hasProfile: Boolean(fullName && phone),
      hasPhone: Boolean(phone),
      hasAddress: Boolean(typedAddress?.url_address || urlGoogleMaps),
    },
  };
}

export async function getClientContextPayload(userId: string): Promise<ConsumerClientContextPayload> {
  const supabaseServer = getSupabaseServer();

  const { data: userProfile, error: profileError } = await (supabaseServer as any)
    .from('user_profiles')
    .select('user_id, email, full_name, phone, url_google_maps, role_id, is_online, subscription_status')
    .eq('user_id', userId)
    .maybeSingle();

  if (profileError || !userProfile) {
    throw new Error('No se encontró el perfil del cliente');
  }

  const { data: customer, error: customerError } = await (supabaseServer as any)
    .from('customers')
    .select('id, auth_user_id, name, phone, email, address')
    .eq('auth_user_id', userId)
    .maybeSingle();

  if (customerError || !customer) {
    throw new Error('No se encontró el registro de cliente');
  }

  const typedProfile = userProfile as ContextProfileRow;
  const typedCustomer = customer as CustomerRow;

  const [addressResult, recentOrdersResult, recentSearchesResult, socialSettingsResult, dietaryProfileResult] = await Promise.all([
    (supabaseServer as any)
      .from('customer_address')
      .select('id, customer_id, url_address, building_type, unit_details, delivery_notes')
      .eq('customer_id', typedCustomer.id)
      .maybeSingle(),
    (supabaseServer as any)
      .from('orders')
      .select('id, restaurant_id, total, created_at, status_id, delivery_address')
      .eq('customer_id', typedCustomer.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabaseServer as any)
      .from('customer_searches')
      .select('id, query, created_at')
      .eq('customer_id', typedCustomer.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabaseServer as any)
      .from('social_settings')
      .select('share_activity')
      .eq('user_id', userId)
      .maybeSingle(),
    (supabaseServer as any)
      .from('user_dietary_profiles')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const address = (addressResult.data ?? null) as CustomerAddressRow | null;
  const recentOrders = Array.isArray(recentOrdersResult.data)
    ? (recentOrdersResult.data as RecentOrderRow[])
    : [];
  const recentSearches = Array.isArray(recentSearchesResult.data)
    ? (recentSearchesResult.data as RecentSearchRow[])
    : [];
  const socialSettings = (socialSettingsResult.data ?? null) as SocialSettingsRow | null;
  const dietaryProfile = (dietaryProfileResult.data ?? null) as Record<string, unknown> | null;

  const favorites = Array.from(
    new Set(recentOrders.map((order) => order.restaurant_id).filter((restaurantId): restaurantId is string => Boolean(restaurantId))),
  );

  return {
    profile: {
      authUserId: userId,
      userProfile: typedProfile,
      customer: typedCustomer,
      primaryAddress: address,
    },
    favorites,
    recentSearches,
    orderHistorySummary: {
      total: recentOrders.length,
      recent: recentOrders,
    },
    settings: {
      shareActivity: Boolean(socialSettings?.share_activity),
      dietaryProfile,
    },
  };
}