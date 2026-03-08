import { describe, expect, it, beforeEach, vi } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';

const { resolveAuthenticatedCustomer, getSupabaseServer } = vi.hoisted(() => ({
  resolveAuthenticatedCustomer: vi.fn(),
  getSupabaseServer: vi.fn(),
}));

vi.mock('@/app/api/_lib/auth', () => ({
  resolveAuthenticatedCustomer,
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer,
}));

import { GET, POST } from './route';

describe('customer address route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when auth resolution fails', async () => {
    resolveAuthenticatedCustomer.mockResolvedValue(
      NextResponse.json({ error: 'Unauthorized' }, { status: 401 }),
    );

    const response = await GET(new NextRequest('http://localhost/api/customer/address'));

    expect(response.status).toBe(401);
  });

  it('reads address using authenticated customer ownership', async () => {
    resolveAuthenticatedCustomer.mockResolvedValue({ customerId: 'cust-1' });

    const maybeSingle = vi.fn().mockResolvedValue({
      data: {
        customer_id: 'cust-1',
        url_address: 'https://maps.example/address',
        building_type: 'Other',
        delivery_notes: 'Meet at door',
      },
      error: null,
    });
    const limit = vi.fn(() => ({ maybeSingle }));
    const order = vi.fn(() => ({ limit }));
    const eq = vi.fn(() => ({ order }));
    const select = vi.fn(() => ({ eq }));

    getSupabaseServer.mockReturnValue({
      from: vi.fn(() => ({ select })),
    });

    const response = await GET(new NextRequest('http://localhost/api/customer/address'));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(eq).toHaveBeenCalledWith('customer_id', 'cust-1');
    expect(body.address.url_address).toBe('https://maps.example/address');
  });

  it('writes address without accepting phone-based identity', async () => {
    resolveAuthenticatedCustomer.mockResolvedValue({ customerId: 'cust-1' });

    const single = vi.fn().mockResolvedValue({
      data: {
        customer_id: 'cust-1',
        url_address: 'https://maps.example/address',
        building_type: 'Other',
        delivery_notes: 'Meet at door',
      },
      error: null,
    });
    const select = vi.fn(() => ({ single }));
    const upsert = vi.fn(() => ({ select }));

    getSupabaseServer.mockReturnValue({
      from: vi.fn(() => ({ upsert })),
    });

    const response = await POST(new NextRequest('http://localhost/api/customer/address', {
      method: 'POST',
      body: JSON.stringify({
        urlAddress: 'https://maps.example/address',
        buildingType: 'Other',
        deliveryNotes: 'Meet at door',
        phone: '50688888888',
      }),
      headers: { 'Content-Type': 'application/json' },
    }));

    expect(response.status).toBe(200);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({ customer_id: 'cust-1', url_address: 'https://maps.example/address' }),
      { onConflict: 'customer_id' },
    );
  });
});