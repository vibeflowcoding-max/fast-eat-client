import type { CartItem, OrderMetadata, RestaurantInfo } from '@/types';

export type PersistedCartStorageSource = 'database' | 'local';

export interface PersistedCartRecord {
  id: string;
  customerId: string;
  restaurantId: string;
  branchId: string;
  restaurantSlug: string;
  restaurantName: string;
  branchName: string | null;
  itemCount: number;
  subtotal: number;
  isActive: boolean;
  cartItems: CartItem[];
  checkoutDraft: OrderMetadata;
  restaurantSnapshot: RestaurantInfo | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  lastRestoredAt: string | null;
  storageSource: PersistedCartStorageSource;
}

export interface PersistedCartUpsertInput {
  branchId: string;
  cartItems: CartItem[];
  checkoutDraft: OrderMetadata;
  restaurantSnapshot: RestaurantInfo | null;
  metadata?: Record<string, unknown>;
}

function toFiniteNumber(value: unknown): number {
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

function sanitizeCartItem(item: Record<string, unknown>): CartItem {
  return {
    id: String(item.id || ''),
    name: String(item.name || 'Item'),
    description: String(item.description || ''),
    image: String(item.image || ''),
    price: toFiniteNumber(item.price),
    category: String(item.category || ''),
    quantity: Math.max(1, toFiniteNumber(item.quantity) || 1),
    notes: String(item.notes || ''),
  };
}

export function sanitizeCartItems(value: unknown): CartItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is Record<string, unknown> => Boolean(item && typeof item === 'object'))
    .map(sanitizeCartItem)
    .filter((item) => item.id && item.name);
}

export function sanitizeOrderMetadata(value: unknown): OrderMetadata {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};

  return {
    customerName: String(source.customerName || ''),
    customerPhone: String(source.customerPhone || ''),
    paymentMethod: String(source.paymentMethod || ''),
    orderType: String(source.orderType || ''),
    source: String(source.source || 'client'),
    address: String(source.address || ''),
    gpsLocation: String(source.gpsLocation || ''),
    customerLatitude: typeof source.customerLatitude === 'number' ? source.customerLatitude : undefined,
    customerLongitude: typeof source.customerLongitude === 'number' ? source.customerLongitude : undefined,
    locationOverriddenFromProfile: Boolean(source.locationOverriddenFromProfile),
    locationDifferenceAcknowledged: Boolean(source.locationDifferenceAcknowledged),
    tableNumber: typeof source.tableNumber === 'string' ? source.tableNumber : undefined,
    scheduledFor: typeof source.scheduledFor === 'string' ? source.scheduledFor : null,
    optOutCutlery: typeof source.optOutCutlery === 'boolean' ? source.optOutCutlery : undefined,
  };
}

export function buildPersistedCartSummary(cartItems: CartItem[]) {
  return {
    itemCount: cartItems.reduce((sum, item) => sum + item.quantity, 0),
    subtotal: cartItems.reduce((sum, item) => sum + (item.price * item.quantity), 0),
  };
}

export function normalizePersistedCartRecord(row: Record<string, unknown>, storageSource: PersistedCartStorageSource): PersistedCartRecord {
  const cartItems = sanitizeCartItems(row.cart_items ?? row.cartItems);
  const checkoutDraft = sanitizeOrderMetadata(row.checkout_draft ?? row.checkoutDraft);
  const restaurantSnapshot = row.restaurant_snapshot && typeof row.restaurant_snapshot === 'object'
    ? row.restaurant_snapshot as RestaurantInfo
    : row.restaurantSnapshot && typeof row.restaurantSnapshot === 'object'
      ? row.restaurantSnapshot as RestaurantInfo
      : null;
  const summary = buildPersistedCartSummary(cartItems);

  return {
    id: String(row.id || ''),
    customerId: String(row.customer_id ?? row.customerId ?? ''),
    restaurantId: String(row.restaurant_id ?? row.restaurantId ?? ''),
    branchId: String(row.branch_id ?? row.branchId ?? ''),
    restaurantSlug: String(row.restaurant_slug ?? row.restaurantSlug ?? ''),
    restaurantName: String(row.restaurant_name ?? row.restaurantName ?? restaurantSnapshot?.name ?? ''),
    branchName: row.branch_name == null && row.branchName == null ? null : String(row.branch_name ?? row.branchName ?? ''),
    itemCount: Math.max(0, toFiniteNumber(row.item_count ?? row.itemCount) || summary.itemCount),
    subtotal: toFiniteNumber(row.subtotal) || summary.subtotal,
    isActive: row.is_active == null && row.isActive == null ? true : Boolean(row.is_active ?? row.isActive),
    cartItems,
    checkoutDraft,
    restaurantSnapshot,
    metadata: row.metadata && typeof row.metadata === 'object' ? row.metadata as Record<string, unknown> : {},
    createdAt: String(row.created_at ?? row.createdAt ?? new Date().toISOString()),
    updatedAt: String(row.updated_at ?? row.updatedAt ?? new Date().toISOString()),
    lastRestoredAt: row.last_restored_at == null && row.lastRestoredAt == null ? null : String(row.last_restored_at ?? row.lastRestoredAt ?? ''),
    storageSource,
  };
}