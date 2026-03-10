import { beforeEach, describe, expect, it, vi } from 'vitest';

const branchesMaybeSingle = vi.fn();
const tablesMaybeSingle = vi.fn();
const feeRulesOrder = vi.fn();

const from = vi.fn((table: string) => {
  if (table === 'branches') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: branchesMaybeSingle,
        })),
      })),
    };
  }

  if (table === 'branch_quantity_tables') {
    return {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: tablesMaybeSingle,
        })),
      })),
    };
  }

  if (table === 'fee_rules') {
    return {
      select: vi.fn(() => ({
        or: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: feeRulesOrder,
          })),
        })),
      })),
    };
  }

  throw new Error(`Unexpected table ${table}`);
});

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from,
  })),
}));

describe('getBranchCheckoutContextPayload', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    branchesMaybeSingle.mockResolvedValue({
      data: {
        id: 'branch-1',
        name: 'Sumo Sushi Escazu',
        address: 'Escazu',
        phone: '+50612345678',
        rating: 4.7,
        is_active: true,
        image_url: 'https://example.com/branch.png',
        restaurant_id: 'restaurant-1',
        google_maps_url: 'https://maps.google.com/?q=branch',
        opening_hours: { monday: [{ open: '09:00', close: '17:00' }] },
        payment_methods: ['cash', 'card', 'sinpe'],
        service_modes: ['pickup', 'delivery', 'dine_in'],
        restaurants: {
          id: 'restaurant-1',
          name: 'Sumo Sushi',
          description: 'Japanese food',
          email: 'team@sumo.test',
          rating: 4.6,
          google_maps_url: 'https://maps.google.com/?q=restaurant',
          opening_hours: { sunday: [{ open: '10:00', close: '18:00' }] },
          payment_methods: ['cash'],
          service_modes: ['pickup'],
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      },
      error: null,
    });

    tablesMaybeSingle.mockResolvedValue({
      data: { quantity: 8, is_available: true },
      error: null,
    });

    feeRulesOrder.mockResolvedValue({
      data: [
        { branch_id: 'branch-1', service_fee: 0.04, platform_fee: 0.05 },
      ],
      error: null,
    });
  });

  it('prefers branch-level payment methods and service modes for checkout', async () => {
    const { getBranchCheckoutContextPayload } = await import('./branches');

    const payload = await getBranchCheckoutContextPayload('branch-1');

    expect(payload?.restaurant).toMatchObject({
      payment_methods: ['cash', 'card', 'sinpe'],
      service_modes: ['pickup', 'delivery', 'dine_in'],
      google_maps_url: 'https://maps.google.com/?q=branch',
      opening_hours: { monday: [{ open: '09:00', close: '17:00' }] },
    });
    expect(payload?.feeRates).toMatchObject({
      serviceFeeRate: 0.04,
      platformFeeRate: 0.05,
      source: 'branch',
    });
  });

  it('falls back to restaurant-level arrays when branch-level values are empty', async () => {
    branchesMaybeSingle.mockResolvedValueOnce({
      data: {
        id: 'branch-1',
        name: 'Sumo Sushi Escazu',
        address: 'Escazu',
        phone: '+50612345678',
        rating: 4.7,
        is_active: true,
        image_url: 'https://example.com/branch.png',
        restaurant_id: 'restaurant-1',
        google_maps_url: '',
        opening_hours: null,
        payment_methods: [],
        service_modes: null,
        restaurants: {
          id: 'restaurant-1',
          name: 'Sumo Sushi',
          description: 'Japanese food',
          email: 'team@sumo.test',
          rating: 4.6,
          google_maps_url: 'https://maps.google.com/?q=restaurant',
          opening_hours: { sunday: [{ open: '10:00', close: '18:00' }] },
          payment_methods: ['cash'],
          service_modes: ['pickup'],
          created_at: '2026-01-01T00:00:00.000Z',
          updated_at: '2026-01-02T00:00:00.000Z',
        },
      },
      error: null,
    });

    const { getBranchCheckoutContextPayload } = await import('./branches');

    const payload = await getBranchCheckoutContextPayload('branch-1');

    expect(payload?.restaurant).toMatchObject({
      payment_methods: ['cash'],
      service_modes: ['pickup'],
      google_maps_url: 'https://maps.google.com/?q=restaurant',
      opening_hours: { sunday: [{ open: '10:00', close: '18:00' }] },
    });
  });
});