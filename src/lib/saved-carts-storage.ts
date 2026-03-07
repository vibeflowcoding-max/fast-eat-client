import type { PersistedCartRecord, PersistedCartUpsertInput } from '@/lib/persisted-carts';
import { buildPersistedCartSummary, normalizePersistedCartRecord } from '@/lib/persisted-carts';

const STORAGE_KEY = 'fast-eat:saved-carts';

function readRaw(): Record<string, unknown>[] {
  if (typeof window === 'undefined') {
    return [];
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeRaw(rows: Record<string, unknown>[]) {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows));
}

export function listLocalSavedCarts(): PersistedCartRecord[] {
  return readRaw()
    .map((row) => normalizePersistedCartRecord(row, 'local'))
    .filter((row) => row.isActive)
    .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
}

export function getLocalSavedCart(cartId: string): PersistedCartRecord | null {
  return listLocalSavedCarts().find((row) => row.id === cartId) || null;
}

export function upsertLocalSavedCart(input: PersistedCartUpsertInput & {
  customerId?: string;
  restaurantId: string;
  restaurantSlug: string;
  restaurantName: string;
  branchName?: string | null;
}): PersistedCartRecord {
  const rows = readRaw();
  const now = new Date().toISOString();
  const summary = buildPersistedCartSummary(input.cartItems);
  const existingIndex = rows.findIndex((row) => String(row.branch_id ?? row.branchId ?? '') === input.branchId);

  const nextRow: Record<string, unknown> = {
    id: existingIndex >= 0 ? rows[existingIndex].id : `local-cart-${input.branchId}`,
    customer_id: input.customerId || 'local-customer',
    restaurant_id: input.restaurantId,
    branch_id: input.branchId,
    restaurant_slug: input.restaurantSlug,
    restaurant_name: input.restaurantName,
    branch_name: input.branchName || null,
    item_count: summary.itemCount,
    subtotal: summary.subtotal,
    is_active: true,
    cart_items: input.cartItems,
    checkout_draft: input.checkoutDraft,
    restaurant_snapshot: input.restaurantSnapshot,
    metadata: input.metadata || {},
    created_at: existingIndex >= 0 ? rows[existingIndex].created_at : now,
    updated_at: now,
    last_restored_at: existingIndex >= 0 ? rows[existingIndex].last_restored_at ?? null : null,
  };

  if (existingIndex >= 0) {
    rows[existingIndex] = nextRow;
  } else {
    rows.push(nextRow);
  }

  writeRaw(rows);
  return normalizePersistedCartRecord(nextRow, 'local');
}

export function archiveLocalSavedCart(cartId: string): void {
  const rows = readRaw().map((row) => {
    if (String(row.id ?? '') !== cartId) {
      return row;
    }

    return {
      ...row,
      is_active: false,
      updated_at: new Date().toISOString(),
    };
  });

  writeRaw(rows);
}