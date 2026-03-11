import { beforeEach, describe, expect, it, vi } from 'vitest';

const fromMock = vi.fn();

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: fromMock,
  })),
}));

import { createConsumerOrderLocal } from './create';

describe('createConsumerOrderLocal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('persists SINPE payment method when provided by the client flow', async () => {
    let insertedOrderPayload: Record<string, unknown> | null = null;

    fromMock.mockImplementation((table: string) => {
      if (table === 'restaurants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'rest-1', latitude: 9.9, longitude: -84.1, delivery_enabled: true },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'order_statuses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'status-pending', code: 'PENDING' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'customers') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'customer-1' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'payment_methods') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({
                data: { id: 3, code: 'SINPE' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'orders') {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertedOrderPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'order-1',
                    status_id: 'status-pending',
                    source: 'client',
                    delivery_enabled: true,
                    delivery_distance_km: null,
                    delivery_base_price: null,
                    prep_time_estimate: 0,
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    await createConsumerOrderLocal({
      restaurant_id: 'rest-1',
      customer_name: 'Ana',
      customer_phone: '+50688888888',
      paymentMethod: 'sinpe',
      items: [],
      total_amount: 12000,
      order_type: 'pickup',
      source: 'client',
    });

    expect(insertedOrderPayload).toEqual(
      expect.objectContaining({
        payment_method_id: 3,
        payment_method: 'SINPE',
      }),
    );
  });

  it('defaults to CASH when payment method is omitted', async () => {
    let insertedOrderPayload: Record<string, unknown> | null = null;

    fromMock.mockImplementation((table: string) => {
      if (table === 'restaurants') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'rest-1', latitude: 9.9, longitude: -84.1, delivery_enabled: true },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'order_statuses') {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'status-pending', code: 'PENDING' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'customers') {
        return {
          upsert: vi.fn().mockReturnValue({
            select: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: 'customer-1' },
                error: null,
              }),
            }),
          }),
        };
      }

      if (table === 'orders') {
        return {
          insert: vi.fn((payload: Record<string, unknown>) => {
            insertedOrderPayload = payload;
            return {
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: 'order-1',
                    status_id: 'status-pending',
                    source: 'client',
                    delivery_enabled: true,
                    delivery_distance_km: null,
                    delivery_base_price: null,
                    prep_time_estimate: 0,
                  },
                  error: null,
                }),
              }),
            };
          }),
        };
      }

      throw new Error(`Unexpected table ${table}`);
    });

    await createConsumerOrderLocal({
      restaurant_id: 'rest-1',
      customer_name: 'Ana',
      customer_phone: '+50688888888',
      items: [],
      total_amount: 12000,
      order_type: 'pickup',
      source: 'client',
    });

    expect(insertedOrderPayload).toEqual(
      expect.objectContaining({
        payment_method: 'CASH',
      }),
    );
  });
});