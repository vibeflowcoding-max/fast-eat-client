import { describe, expect, it } from 'vitest';
import { buildPersistedCartSummary, normalizePersistedCartRecord } from '@/lib/persisted-carts';

describe('persisted cart helpers', () => {
  it('builds correct cart totals from item snapshots', () => {
    const summary = buildPersistedCartSummary([
      { id: '1', name: 'Roll', description: '', image: '', price: 4500, category: 'Sushi', quantity: 2, notes: '' },
      { id: '2', name: 'Tea', description: '', image: '', price: 1200, category: 'Drinks', quantity: 1, notes: '' },
    ]);

    expect(summary.itemCount).toBe(3);
    expect(summary.subtotal).toBe(10200);
  });

  it('normalizes database rows into persisted cart records', () => {
    const normalized = normalizePersistedCartRecord({
      id: 'cart-1',
      customer_id: 'customer-1',
      restaurant_id: 'restaurant-1',
      branch_id: 'branch-1',
      restaurant_slug: 'sumo-sushi',
      restaurant_name: 'Sumo Sushi',
      item_count: 2,
      subtotal: 9000,
      is_active: true,
      cart_items: [
        { id: 'item-1', name: 'Roll', description: '', image: '', price: 4500, category: 'Sushi', quantity: 2, notes: '' },
      ],
      checkout_draft: { customerName: 'Ivan', customerPhone: '50688888888', paymentMethod: 'cash', orderType: 'delivery' },
      restaurant_snapshot: { id: 'branch-1', name: 'Sumo Sushi' },
      created_at: '2026-03-06T00:00:00.000Z',
      updated_at: '2026-03-06T00:00:00.000Z',
    }, 'database');

    expect(normalized.restaurantSlug).toBe('sumo-sushi');
    expect(normalized.itemCount).toBe(2);
    expect(normalized.checkoutDraft.customerName).toBe('Ivan');
    expect(normalized.storageSource).toBe('database');
  });
});