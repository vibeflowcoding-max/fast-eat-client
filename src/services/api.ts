import { BranchCheckoutContextPayload, BranchMenuCategoryItemsPayload, BranchMenuCategorySummary, BranchShellPayload, CartItem, ClientBootstrapPayload, DeliveryBid, DeliveryTrackingPayload, DietaryOptionsCatalog, DietaryProfile, MenuItem, MysteryBoxOffersResponse, OrderMetadata, PersistedCartRecord, PlannerRecommendationsResponse, RestaurantInfo, SavedOrderSplitDraft } from '../types';
import { APP_CONSTANTS } from '../constants';
import { supabase } from '@/lib/supabase';
import { getLocalSavedCart, listLocalSavedCarts, upsertLocalSavedCart, archiveLocalSavedCart } from '@/lib/saved-carts-storage';

export type InteractionType = 'chat' | 'carrito' | 'generar_orden' | 'get_carrito' | 'delete_cart';
export type CartAction = 'add' | 'increment' | 'reduce' | 'remove' | 'details' | 'clear' | 'none' | 'recommendation' | 'add-to-cart';

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isStorageFallbackError(errorMessage: string): boolean {
  const normalized = errorMessage.toLowerCase();
  return normalized.includes('could not')
    || normalized.includes('relation')
    || normalized.includes('carts')
    || normalized.includes('saved cart')
    || normalized.includes('saved carts')
    || normalized.includes('missing supabase server credentials')
    || normalized.includes('missing authenticated session')
    || normalized.includes('missing authorization header')
    || normalized.includes('unauthorized');
}

async function getAuthenticatedHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const accessToken = data.session?.access_token;

  if (!accessToken) {
    throw new Error('Missing authenticated session');
  }

  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
  };
}

const extractDataFromN8N = (data: any) => {
  if (!data) return { message: "", action: "none", confirmation: false };

  let source = Array.isArray(data) ? data[0] : data;
  const original = { ...source };

  if (source?.output && typeof source.output === 'object') {
    source = source.output;
  }

  let message = source?.message || source?.reply_message || source?.text || original?.message || "";

  if (typeof message === 'string' && (message.includes("Workflow execution failed") || message.includes("Error: "))) {
    message = APP_CONSTANTS.MESSAGES.TECHNICAL_ERROR;
  }

  const action = source?.action || original?.action || "none";
  const item_id = source?.item_id || source?.productId || original?.item_id || null;
  const item_ids = source?.item_ids || source?.items || source?.cart?.items || original?.item_ids || null;

  const order_id = source?.order_id || source?.orderId || null;
  const order_number = source?.order_number || source?.orderNumber || null;

  const confirmation =
    source?.confirmation === true ||
    source?.confirmation === 'true' ||
    source?.confirmation === 'success' ||
    original?.confirmation === true ||
    original?.output?.confirmation === true;

  return { message, action, item_id, item_ids, confirmation, order_id, order_number };
};

const mapBidFromApi = (bid: any): DeliveryBid => ({
  id: String(bid?.id || ''),
  bidAmount: Number(bid?.bidAmount ?? bid?.driver_offer ?? bid?.base_price ?? 0),
  driverRating: Number(bid?.driverRating ?? bid?.driver_rating_snapshot ?? 0),
  estimatedTimeMinutes: bid?.estimatedTimeMinutes ?? bid?.estimated_time_minutes ?? null,
  driverNotes: bid?.driverNotes ?? bid?.driver_notes ?? null,
  basePrice: Number(bid?.basePrice ?? bid?.base_price ?? 0),
  customerCounterOffer: bid?.customerCounterOffer ?? bid?.customer_counter_offer ?? null,
  status: String(bid?.status ?? 'ACTIVE'),
  expiresAt: String(bid?.expiresAt ?? bid?.expires_at ?? new Date().toISOString()),
  createdAt: String(bid?.createdAt ?? bid?.created_at ?? new Date().toISOString())
});

function mapMenuItem(rawItem: any, categoryName?: string): MenuItem {
  return {
    id: String(rawItem?.id || rawItem?.productId || rawItem?.name),
    name: rawItem?.name || 'Platillo',
    description: rawItem?.description || 'Delicioso platillo tradicional.',
    price: Number(rawItem?.price || rawItem?.branch_price || rawItem?.base_price || 0),
    category: categoryName || rawItem?.category || 'General',
    image: rawItem?.image || rawItem?.image_url || 'https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&q=80&w=800',
    ingredients: Array.isArray(rawItem?.ingredients) ? rawItem.ingredients.map(String) : [],
    defaultVariantId: rawItem?.defaultVariantId || rawItem?.default_variant_id || null,
    variants: Array.isArray(rawItem?.variants)
      ? rawItem.variants.map((variant: any) => ({
          id: String(variant.id),
          name: String(variant.name || 'Regular'),
          price: Number(variant.price || 0),
          isDefault: Boolean(variant.isDefault ?? variant.is_default),
        }))
      : [],
    modifierGroups: Array.isArray(rawItem?.modifierGroups)
      ? rawItem.modifierGroups
      : Array.isArray(rawItem?.modifier_groups)
        ? rawItem.modifier_groups.map((group: any) => ({
            id: String(group.id),
            name: String(group.name || 'Extras'),
            minSelection: Number(group.minSelection ?? group.min_selection ?? 0),
            maxSelection: group.maxSelection ?? group.max_selection ?? null,
            required: Boolean(group.required),
            options: Array.isArray(group.options)
              ? group.options.map((option: any) => ({
                  id: String(option.id),
                  name: String(option.name || 'Opción'),
                  priceDelta: Number(option.priceDelta ?? option.price_delta ?? 0),
                  available: option.available !== false,
                  stockCount: option.stockCount ?? option.stock_count ?? null,
                }))
              : [],
          }))
        : [],
    hasStructuredCustomization: Boolean(
      rawItem?.hasStructuredCustomization
        || (Array.isArray(rawItem?.modifierGroups) && rawItem.modifierGroups.length > 0)
        || (Array.isArray(rawItem?.modifier_groups) && rawItem.modifier_groups.length > 0),
    ),
  };
}

function mapRestaurantInfoPayload(data: any): RestaurantInfo | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  return {
    id: String(data.id || ''),
    name: String(data.name || 'Restaurante'),
    description: String(data.description || ''),
    category: String(data.category || ''),
    address: String(data.address || ''),
    phone: String(data.phone || ''),
    email: String(data.email || ''),
    rating: Number(data.rating || 0),
    image_url: String(data.image_url || ''),
    google_maps_url: String(data.google_maps_url || ''),
    opening_hours: typeof data.opening_hours === 'object' && data.opening_hours !== null ? data.opening_hours : {},
    payment_methods: Array.isArray(data.payment_methods) ? data.payment_methods.map(String) : [],
    service_modes: Array.isArray(data.service_modes) ? data.service_modes.map(String) : [],
    active: Boolean(data.active),
    created_at: String(data.created_at || ''),
    updated_at: String(data.updated_at || ''),
  };
}

export const fetchMenuFromAPI = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<{ items: MenuItem[], categories: string[] }> => {
  try {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) {
      return { items: [], categories: [] };
    }

    const response = await fetch(`/api/menu/branch/${encodeURIComponent(normalizedBranchId)}`, { signal });
    if (!response.ok) throw new Error('Error al cargar el menú');
    const data = await response.json();
    const categoryEntries = Array.isArray(data?.categories) ? data.categories : [];
    const normalizedFromCategories: MenuItem[] = categoryEntries.flatMap((category: any) => {
      const categoryName = String(category?.name || 'General');
      const categoryItems = Array.isArray(category?.items) ? category.items : [];

      return categoryItems.map((item: any) => ({
        id: String(item.id || item.productId || item.name),
        name: item.name || 'Platillo',
        description: item.description || 'Delicioso platillo tradicional.',
        price: Number(item.price || item.branch_price || item.base_price || 0),
        category: categoryName,
        image: item.image_url || `https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&q=80&w=800`,
        ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(String) : [],
        defaultVariantId: item.default_variant_id || null,
        variants: Array.isArray(item.variants)
          ? item.variants.map((variant: any) => ({
              id: String(variant.id),
              name: String(variant.name || 'Regular'),
              price: Number(variant.price || item.price || 0),
              isDefault: Boolean(variant.is_default),
            }))
          : [],
        modifierGroups: Array.isArray(item.modifier_groups)
          ? item.modifier_groups.map((group: any) => ({
              id: String(group.id),
              name: String(group.name || 'Extras'),
              minSelection: Number(group.min_selection || 0),
              maxSelection: group.max_selection == null ? null : Number(group.max_selection),
              required: Boolean(group.required),
              options: Array.isArray(group.options)
                ? group.options.map((option: any) => ({
                    id: String(option.id),
                    name: String(option.name || 'Opción'),
                    priceDelta: Number(option.price_delta || 0),
                    available: option.available !== false,
                    stockCount: option.stock_count ?? null,
                  }))
                : [],
            }))
          : [],
        hasStructuredCustomization: Array.isArray(item.modifier_groups) && item.modifier_groups.length > 0,
      }));
    });

    const rawItems = normalizedFromCategories.length > 0 ? normalizedFromCategories : (Array.isArray(data) ? data : (data.menu || []));
    const items: MenuItem[] = rawItems.map((item: any) => ({
      id: String(item.id || item.productId || item.name),
      name: item.name || 'Platillo',
      description: item.description || 'Delicioso platillo tradicional.',
      price: Number(item.price || item.branch_price || item.base_price || 0),
      category: item.category || 'General',
      image: item.image || item.image_url || `https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?auto=format&fit=crop&q=80&w=800`,
      ingredients: Array.isArray(item.ingredients) ? item.ingredients.map(String) : [],
      defaultVariantId: item.defaultVariantId || item.default_variant_id || null,
      variants: Array.isArray(item.variants) ? item.variants : [],
      modifierGroups: Array.isArray(item.modifierGroups) ? item.modifierGroups : Array.isArray(item.modifier_groups) ? item.modifier_groups : [],
      hasStructuredCustomization: Boolean(item.hasStructuredCustomization || (Array.isArray(item.modifierGroups) && item.modifierGroups.length > 0) || (Array.isArray(item.modifier_groups) && item.modifier_groups.length > 0)),
    }));
    const categories = Array.from(new Set(items.map(i => i.category)));
    return { items, categories };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching menu:', error);
    return { items: [], categories: [] };
  }
};

export const fetchRestaurantInfo = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<import('../types').RestaurantInfo | null> => {
  try {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) {
      return null;
    }

    const response = await fetch(`/api/restaurants/public/branch/${encodeURIComponent(normalizedBranchId)}`, { signal });
    if (!response.ok) throw new Error('Error al cargar la información del restaurante');
    const data = await response.json();
    if (data.success && data.data) {
      return mapRestaurantInfoPayload(data.data);
    }
    return mapRestaurantInfoPayload(data?.data ?? data);
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching restaurant info:', error);
    return null;
  }
};

export const fetchTableQuantity = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<{ quantity: number, is_available: boolean }> => {
  try {
    const response = await fetch(`/api/tables?branchId=${branchId}`, { signal });
    if (!response.ok) return { quantity: 0, is_available: false };
    return await response.json();
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching table quantity:', error);
    return { quantity: 0, is_available: false };
  }
};

export const fetchCheckoutFeeRates = async (branchId: string): Promise<{ serviceFeeRate: number; platformFeeRate: number }> => {
  try {
    if (!branchId) {
      return { serviceFeeRate: 0, platformFeeRate: 0 };
    }

    const response = await fetch(`/api/checkout/pricing?branchId=${encodeURIComponent(branchId)}`);
    if (!response.ok) {
      return { serviceFeeRate: 0, platformFeeRate: 0 };
    }

    const data = await response.json();
    const serviceFeeRate = Number(data?.serviceFeeRate);
    const platformFeeRate = Number(data?.platformFeeRate);

    return {
      serviceFeeRate: Number.isFinite(serviceFeeRate) ? serviceFeeRate : 0,
      platformFeeRate: Number.isFinite(platformFeeRate) ? platformFeeRate : 0,
    };
  } catch {
    return { serviceFeeRate: 0, platformFeeRate: 0 };
  }
};

export const fetchClientBootstrap = async (
  signal?: AbortSignal,
): Promise<ClientBootstrapPayload | null> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch('/api/consumer/me/bootstrap', {
    method: 'GET',
    headers,
    cache: 'no-store',
    signal,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not load bootstrap context');
  }

  return (data?.data || data) as ClientBootstrapPayload;
};

export const fetchBranchShell = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<BranchShellPayload | null> => {
  try {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) {
      return null;
    }

    const response = await fetch(`/api/branches/${encodeURIComponent(normalizedBranchId)}/shell`, {
      cache: 'no-store',
      signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || 'Could not load branch shell');
    }

    const payload = data?.data || data;

    return {
      branchId: String(payload?.branchId || normalizedBranchId),
      restaurant: mapRestaurantInfoPayload(payload?.restaurant),
      tableQuantity: Number(payload?.tableQuantity || 0),
      isTableAvailable: Boolean(payload?.isTableAvailable),
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching branch shell:', error);
    return null;
  }
};

export const fetchCheckoutContext = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<BranchCheckoutContextPayload | null> => {
  try {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) {
      return null;
    }

    const response = await fetch(`/api/branches/${encodeURIComponent(normalizedBranchId)}/checkout-context`, {
      cache: 'no-store',
      signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || 'Could not load checkout context');
    }

    const payload = data?.data || data;
    const feeRates = payload?.feeRates || {};

    return {
      branchId: String(payload?.branchId || normalizedBranchId),
      restaurant: mapRestaurantInfoPayload(payload?.restaurant),
      tableQuantity: Number(payload?.tableQuantity || 0),
      isTableAvailable: Boolean(payload?.isTableAvailable),
      feeRates: {
        serviceFeeRate: Number(feeRates?.serviceFeeRate || 0),
        platformFeeRate: Number(feeRates?.platformFeeRate || 0),
        source: typeof feeRates?.source === 'string' ? feeRates.source : 'default',
      },
    };
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching checkout context:', error);
    return null;
  }
};

export const fetchBranchMenuCategories = async (
  branchId: string,
  signal?: AbortSignal,
): Promise<BranchMenuCategorySummary[]> => {
  try {
    const normalizedBranchId = String(branchId || '').trim();
    if (!normalizedBranchId) {
      return [];
    }

    const response = await fetch(`/api/menu/branch/${encodeURIComponent(normalizedBranchId)}/categories`, {
      cache: 'no-store',
      signal,
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error || 'Could not load menu categories');
    }

    const payload = data?.categories || data?.data?.categories || data?.data || [];
    return Array.isArray(payload)
      ? payload.map((category: any) => ({
          id: String(category?.id || category?.name || 'general'),
          name: String(category?.name || 'General'),
          itemCount: Number(category?.itemCount || 0),
        }))
      : [];
  } catch (error) {
    if (isAbortError(error)) {
      throw error;
    }

    console.error('Error fetching branch menu categories:', error);
    return [];
  }
};

export const fetchBranchMenuItems = async (
  branchId: string,
  params: { categoryId: string; cursor?: string | null; limit?: number; channel?: string },
  signal?: AbortSignal,
): Promise<BranchMenuCategoryItemsPayload> => {
  const normalizedBranchId = String(branchId || '').trim();
  const normalizedCategoryId = String(params.categoryId || '').trim();

  if (!normalizedBranchId || !normalizedCategoryId) {
    return {
      category: null,
      items: [],
      nextCursor: null,
      total: 0,
    };
  }

  const searchParams = new URLSearchParams({
    categoryId: normalizedCategoryId,
    limit: String(params.limit || 12),
    channel: params.channel || 'delivery',
  });

  if (params.cursor) {
    searchParams.set('cursor', params.cursor);
  }

  const response = await fetch(
    `/api/menu/branch/${encodeURIComponent(normalizedBranchId)}/items?${searchParams.toString()}`,
    {
      cache: 'no-store',
      signal,
    },
  );
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data?.error || 'Could not load menu items');
  }

  const payload = data?.data || data;
  const categoryName = String(payload?.category?.name || 'General');
  const items = Array.isArray(payload?.items)
    ? payload.items.map((item: any) => mapMenuItem(item, categoryName))
    : [];

  return {
    category: payload?.category
      ? {
          id: String(payload.category.id || normalizedCategoryId),
          name: categoryName,
        }
      : null,
    items,
    nextCursor: payload?.nextCursor ? String(payload.nextCursor) : null,
    total: Number(payload?.total || items.length),
  };
};

export const fetchBranches = async (): Promise<any[]> => {
  try {
    const response = await fetch('/api/branches');
    if (!response.ok) return [];
    return await response.json();
  } catch (error) {
    console.error('Error fetching branches:', error);
    return [];
  }
};

export const sendChatToN8N = async (
  message: string,
  cart: CartItem[],
  branchId: string,
  fromNumber: string,
  interaction: InteractionType = 'chat',
  action: CartAction = 'none',
  itemDetails?: CartItem,
  orderMetadata?: OrderMetadata,
  isTest: boolean = false
) => {
  try {
    const payload = {
      message,
      fromNumber,
      branch_id: branchId,
      intencion: interaction,
      action,
      metadata: orderMetadata ? {
        ...orderMetadata,
        customerPhone: fromNumber,
        orderType: orderMetadata.orderType,
        items: cart.map(i => ({
          item_id: i.id,
          nombre: i.name,
          cantidad: i.quantity,
          detalles: i.notes || "",
          precio: i.price
        }))
      } : undefined,
      ...((interaction === 'carrito' || interaction === 'generar_orden') && itemDetails ? {
        item_id: itemDetails.id,
        nombre: itemDetails.name,
        cantidad: itemDetails.quantity,
        detalles: itemDetails.notes || "",
        precio: itemDetails.price
      } : {})
    };

    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        isTest,
      }),
    });

    const data = await response.json();
    const extracted = extractDataFromN8N(data);
    return {
      output: extracted.message,
      action: extracted.action as CartAction,
      item_id: extracted.item_id,
      item_ids: extracted.item_ids as any[],
      confirmation: extracted.confirmation,
      order_id: extracted.order_id,
      order_number: extracted.order_number
    };
  } catch {
    return {
      output: APP_CONSTANTS.MESSAGES.CONNECTION_ERROR,
      action: "none" as CartAction,
      confirmation: false
    };
  }
};

export const submitOrderToMCP = async (
  cart: CartItem[],
  orderMetadata: OrderMetadata,
  branchId: string,
  fallbackPhone?: string,
) => {
  const total = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
  const normalizedCustomerName = String(orderMetadata.customerName || '').trim();
  const normalizedCustomerPhone = String(orderMetadata.customerPhone || fallbackPhone || '').trim();

  const payload = {
    branchId,
    totalAmount: total,
    customerName: normalizedCustomerName,
    customerPhone: normalizedCustomerPhone,
    fromNumber: normalizedCustomerPhone,
    paymentMethod: orderMetadata.paymentMethod,
    orderType: orderMetadata.orderType,
    source: 'client',
    address: orderMetadata.address,
    customerLatitude: orderMetadata.customerLatitude,
    customerLongitude: orderMetadata.customerLongitude,
    scheduledFor: orderMetadata.scheduledFor,
    optOutCutlery: Boolean(orderMetadata.optOutCutlery),
    ...(orderMetadata.tableNumber ? { tableNumber: orderMetadata.tableNumber } : {}),
    items: cart.map(item => ({
      item_id: item.id,
      productId: item.id,
      variantId: item.variantId || item.defaultVariantId || null,
      name: item.name,
      quantity: item.quantity,
      price: item.price,
      notes: item.notes,
      modifiers: (item.selectedModifiers || []).map((modifier) => ({
        modifier_item_id: modifier.modifierItemId,
        quantity: modifier.quantity,
      })),
    })),
  };

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorBody = await response.json().catch(() => ({}));
    throw new Error(errorBody.message || `Error HTTP: ${response.status}`);
  }
  return await response.json();
};

export const fetchDietaryProfile = async (): Promise<DietaryProfile | null> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch('/api/profile/dietary', {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not fetch dietary profile');
  }

  const profile = data?.data?.profile || data?.profile || null;
  if (!profile) {
    return null;
  }

  const preferences = Array.isArray(profile.preferences) ? profile.preferences.map(String) : [];
  const inferredDiet = preferences.includes('vegan')
    ? 'vegan'
    : preferences.includes('vegetarian')
      ? 'vegetarian'
      : preferences.includes('pescatarian')
        ? 'pescatarian'
        : preferences.includes('keto')
          ? 'keto'
          : preferences.includes('paleo')
            ? 'paleo'
            : 'none';

  return {
    diet: inferredDiet,
    allergies: Array.isArray(profile.allergies) ? profile.allergies.map(String) : [],
    intolerances: [],
    preferences,
    strictness: profile.strictness || 'medium',
    dislikedIngredients: Array.isArray(profile.dislikedIngredients)
      ? profile.dislikedIngredients.map(String)
      : Array.isArray(profile.disliked_ingredients)
        ? profile.disliked_ingredients.map(String)
        : [],
    healthGoals: Array.isArray(profile.healthGoals)
      ? profile.healthGoals.map(String)
      : Array.isArray(profile.health_goals)
        ? profile.health_goals.map(String)
        : [],
    syncStatus: 'synced',
  };
};

export const fetchDietaryOptions = async (): Promise<DietaryOptionsCatalog> => {
  const response = await fetch('/api/profile/dietary/options', {
    method: 'GET',
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not fetch dietary options');
  }

  return data?.data || data;
};

export const saveDietaryProfile = async (profile: DietaryProfile): Promise<DietaryProfile> => {
  const headers = await getAuthenticatedHeaders();
  const preferences = Array.from(new Set([
    ...(profile.preferences || []),
    ...(profile.diet && profile.diet !== 'none' ? [profile.diet] : []),
  ].filter(Boolean)));

  const response = await fetch('/api/profile/dietary', {
    method: 'PUT',
    headers,
    body: JSON.stringify({
      allergies: profile.allergies || [],
      preferences,
      strictness: profile.strictness || 'medium',
      dislikedIngredients: profile.dislikedIngredients || [],
      healthGoals: profile.healthGoals || [],
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not save dietary profile');
  }

  return {
    ...profile,
    preferences,
    syncStatus: 'synced',
  };
};

export const saveOrderSplitDraft = async (orderId: string, split: SavedOrderSplitDraft): Promise<any> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/splits`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      strategy: split.strategy,
      splitData: split.splitData,
    }),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not save split');
  }

  return data?.data?.split || data?.split || null;
};

export const fetchLatestOrderSplit = async (orderId: string): Promise<any> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/splits/latest`, {
    method: 'GET',
    headers,
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not load split');
  }

  return data?.data?.split || data?.split || null;
};

export const fetchOrderTracking = async (orderId: string): Promise<DeliveryTrackingPayload> => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/tracking`, {
    method: 'GET',
    cache: 'no-store',
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not load tracking');
  }

  return data?.data || data;
};

export const fetchPlannerRecommendations = async (payload: {
  limit?: number;
  budget?: number;
  serviceMode?: 'delivery' | 'pickup';
  mood?: string;
}): Promise<PlannerRecommendationsResponse> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch('/api/planner/recommendations', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not generate recommendations');
  }

  return data?.data || data;
};

export const fetchMysteryBoxOffers = async (payload: {
  limit?: number;
  maxPrice?: number;
  serviceMode?: 'delivery' | 'pickup';
  restaurantId?: string;
  branchId?: string;
}): Promise<MysteryBoxOffersResponse> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch('/api/mystery-box/offers', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not load mystery box offers');
  }

  return data?.data || data;
};

export const acceptMysteryBoxOffer = async (offerId: string): Promise<any> => {
  const headers = await getAuthenticatedHeaders();
  const response = await fetch(`/api/mystery-box/offers/${encodeURIComponent(offerId)}/accept`, {
    method: 'POST',
    headers,
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.error || data?.message || 'Could not accept mystery box offer');
  }

  return data?.data || data;
};

export const getCartFromN8N = async (branchId: string, fromNumber: string, isTest: boolean = false): Promise<any[]> => {
  try {
    const payload = {
      message: "Obtener mi carrito actual",
      fromNumber: fromNumber,
      branch_id: branchId,
      intencion: "get_carrito"
    };
    const response = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payload,
        isTest,
      }),
    });
    const rawData = await response.json();
    const data = Array.isArray(rawData) ? rawData[0] : rawData;
    const finalData = data?.output || data;
    if (finalData?.cart?.items) return finalData.cart.items;
    return [];
  } catch {
    return [];
  }
};

export const sendOrderToN8N = async (message: string, cart: CartItem[], branchId: string, fromNumber: string, interaction: string, action: string, item: any, orderMetadata: OrderMetadata, isTest: boolean = false): Promise<any> => {
  const payload = {
    message,
    fromNumber,
    branch_id: branchId,
    intencion: interaction,
    action: action,
    metadata: {
      ...orderMetadata,
      customerPhone: fromNumber,
      source: 'client',
      orderType: orderMetadata.orderType,
      address: orderMetadata.address || '',
      gpsLocation: orderMetadata.gpsLocation || '',
      customerLatitude: orderMetadata.customerLatitude,
      customerLongitude: orderMetadata.customerLongitude,
      items: cart.map(i => ({
        item_id: i.id,
        nombre: i.name,
        cantidad: i.quantity,
        detalles: i.notes || "",
        precio: i.price
      }))
    }
  };

  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      isTest,
    }),
  });

  if (!response.ok) {
    throw new Error(`Order API Error: ${response.status}`);
  }

  const responseData = await response.json();
  const extracted = extractDataFromN8N(responseData);

  return {
    output: extracted.message,
    action: extracted.action,
    item_id: extracted.item_id,
    item_ids: extracted.item_ids,
    confirmation: extracted.confirmation,
    order_id: extracted.order_id,
    order_number: extracted.order_number
  };
};

export const listOrderBids = async (orderId: string): Promise<{ orderId: string; bids: DeliveryBid[] }> => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/bids`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    cache: 'no-store'
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP: ${response.status}`);
  }

  const payload = data?.data || data;

  const bids = Array.isArray(payload?.bids) ? payload.bids : [];
  return {
    orderId: payload?.orderId || orderId,
    bids: bids.map(mapBidFromApi)
  };
};

export const fetchSavedCarts = async (): Promise<PersistedCartRecord[]> => {
  try {
    const headers = await getAuthenticatedHeaders();
    const response = await fetch('/api/carts', {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Error HTTP: ${response.status}`);
    }

    return Array.isArray(data?.carts) ? data.carts : [];
  } catch (error) {
    if (isStorageFallbackError(error instanceof Error ? error.message : '')) {
      return listLocalSavedCarts();
    }

    throw error;
  }
};

export const saveCurrentCart = async (payload: {
  branchId: string;
  cartItems: CartItem[];
  checkoutDraft: OrderMetadata;
  restaurantSnapshot: RestaurantInfo | null;
  metadata?: Record<string, unknown>;
}): Promise<PersistedCartRecord> => {
  try {
    const headers = await getAuthenticatedHeaders();
    const response = await fetch('/api/carts', {
      method: 'PUT',
      headers,
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Error HTTP: ${response.status}`);
    }

    return data.cart as PersistedCartRecord;
  } catch (error) {
    if (!isStorageFallbackError(error instanceof Error ? error.message : '')) {
      throw error;
    }

    return upsertLocalSavedCart({
      ...payload,
      restaurantId: payload.restaurantSnapshot?.id || payload.branchId,
      restaurantSlug: payload.restaurantSnapshot?.name?.toLowerCase().replace(/ /g, '-') || payload.branchId,
      restaurantName: payload.restaurantSnapshot?.name || 'Restaurant',
      branchName: payload.restaurantSnapshot?.name || null,
    });
  }
};

export const fetchSavedCartById = async (cartId: string): Promise<PersistedCartRecord> => {
  try {
    const headers = await getAuthenticatedHeaders();
    const response = await fetch(`/api/carts/${encodeURIComponent(cartId)}`, {
      method: 'GET',
      headers,
      cache: 'no-store',
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Error HTTP: ${response.status}`);
    }

    return data.cart as PersistedCartRecord;
  } catch (error) {
    if (isStorageFallbackError(error instanceof Error ? error.message : '')) {
      const cart = getLocalSavedCart(cartId);
      if (cart) {
        return cart;
      }
    }

    throw error;
  }
};

export const archiveSavedCart = async (cartId: string): Promise<void> => {
  try {
    const headers = await getAuthenticatedHeaders();
    const response = await fetch(`/api/carts/${encodeURIComponent(cartId)}`, {
      method: 'DELETE',
      headers,
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data?.error || `Error HTTP: ${response.status}`);
    }
  } catch (error) {
    if (isStorageFallbackError(error instanceof Error ? error.message : '')) {
      archiveLocalSavedCart(cartId);
      return;
    }

    throw error;
  }
};

export const acceptBid = async (
  orderId: string,
  bidId: string
): Promise<{
  orderId: string;
  status: string;
  label: string | null;
  deliveryFinalPrice: number;
  subtotal: number;
  feesTotal: number;
  customerTotal: number;
}> => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/bids/${encodeURIComponent(bidId)}/accept`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP: ${response.status}`);
  }

  const payload = data?.data || data;

  return {
    orderId: payload?.orderId || orderId,
    status: payload?.status || 'DRIVER_ASSIGNED',
    label: typeof payload?.label === 'string'
      ? payload.label
      : (typeof payload?.statusLabel === 'string' ? payload.statusLabel : null),
    deliveryFinalPrice: Number(payload?.deliveryFinalPrice ?? 0),
    subtotal: Number(payload?.subtotal ?? 0),
    feesTotal: Number(payload?.feesTotal ?? 0),
    customerTotal: Number(payload?.customerTotal ?? payload?.total ?? 0),
  };
};

export const confirmDelivery = async (
  orderId: string
): Promise<{ orderId: string; acceptedByUser: boolean; status: string; label: string | null }> => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/confirm-delivery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' }
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP: ${response.status}`);
  }

  const payload = data?.data || data;

  return {
    orderId: payload?.orderId || orderId,
    acceptedByUser: Boolean(payload?.acceptedByUser),
    status: payload?.status || 'COMPLETED',
    label: typeof payload?.label === 'string'
      ? payload.label
      : (typeof payload?.statusLabel === 'string' ? payload.statusLabel : null),
  };
};
export const counterOffer = async (
  orderId: string,
  bidId: string,
  customerCounterOffer: number
): Promise<{ orderId: string; status: string; label: string | null }> => {
  const response = await fetch(`/api/orders/${encodeURIComponent(orderId)}/bids/${encodeURIComponent(bidId)}/counter`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ customerCounterOffer })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Error HTTP: ${response.status}`);
  }

  const payload = data?.data || data;

  return {
    orderId: payload?.orderId || orderId,
    status: payload?.status || 'AUCTION_ACTIVE',
    label: typeof payload?.label === 'string'
      ? payload.label
      : (typeof payload?.statusLabel === 'string' ? payload.statusLabel : null),
  };
};
