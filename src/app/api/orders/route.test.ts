import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const {
  maybeSingleMock,
  eqMock,
  selectMock,
  fromMock,
  createConsumerOrderLocalMock,
} = vi.hoisted(() => ({
  maybeSingleMock: vi.fn(),
  eqMock: vi.fn(),
  selectMock: vi.fn(),
  fromMock: vi.fn(),
  createConsumerOrderLocalMock: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: vi.fn(() => undefined),
  })),
}));

vi.mock('@/app/api/_server/upstreams/n8n', () => ({
  postN8nWebhook: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: vi.fn(() => ({
    from: fromMock,
  })),
}));

vi.mock('@/server/orders/create', () => ({
  createBranchOrderRpcLocal: vi.fn(),
  createConsumerOrderLocal: createConsumerOrderLocalMock,
}));

import { POST } from './route';

describe('orders route validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    maybeSingleMock.mockResolvedValue({
      data: { id: 'branch-1', restaurant_id: 'restaurant-1' },
      error: null,
    });
    eqMock.mockReturnValue({ maybeSingle: maybeSingleMock });
    selectMock.mockReturnValue({ eq: eqMock });
    fromMock.mockImplementation((table: string) => {
      if (table === 'branches') {
        return { select: selectMock };
      }

      throw new Error(`Unexpected table ${table}`);
    });
    createConsumerOrderLocalMock.mockResolvedValue({ id: 'order-1' });
  });

  it('rejects unsupported order payloads', async () => {
    const response = await POST(new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({ foo: 'bar' }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({ success: false, message: 'Invalid order payload' }),
    );
  });

  it('forwards paymentMethod to local consumer order creation', async () => {
    const response = await POST(new NextRequest('http://localhost/api/orders', {
      method: 'POST',
      body: JSON.stringify({
        branchId: 'branch-1',
        totalAmount: 2800,
        customerName: 'jalisco12100',
        customerPhone: '+50662528729',
        paymentMethod: 'SINPE',
        orderType: 'pickup',
        items: [
          {
            item_id: 'item-1',
            quantity: 1,
          },
        ],
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(201);
    expect(createConsumerOrderLocalMock).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: 'SINPE',
      }),
    );
  });
});