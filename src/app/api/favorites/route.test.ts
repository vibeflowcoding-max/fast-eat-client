import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const { authGetUserMock, ensureCustomerByAuthUserMock, getSupabaseServerMock } = vi.hoisted(() => ({
  authGetUserMock: vi.fn(),
  ensureCustomerByAuthUserMock: vi.fn(),
  getSupabaseServerMock: vi.fn(),
}));

vi.mock('@/lib/supabase-server', () => ({
  getSupabaseServer: getSupabaseServerMock,
}));

vi.mock('@/app/api/customer/_lib', () => ({
  ensureCustomerByAuthUser: ensureCustomerByAuthUserMock,
}));

import { GET, POST } from './route';

describe('favorites route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authGetUserMock.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'ivan@example.com',
          user_metadata: {},
        },
      },
      error: null,
    });
    ensureCustomerByAuthUserMock.mockResolvedValue({ customerId: 'customer-1' });
  });

  it('resolves a branch id to the canonical restaurant id before saving a favorite', async () => {
    const restaurantMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const branchMaybeSingle = vi.fn().mockResolvedValue({ data: { restaurant_id: 'restaurant-1' }, error: null });
    const existingMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const favoriteRestaurantEq = vi.fn(() => ({ maybeSingle: existingMaybeSingle }));
    const favoriteCustomerEq = vi.fn(() => ({ eq: favoriteRestaurantEq }));
    const insert = vi.fn().mockResolvedValue({ error: null });

    getSupabaseServerMock.mockReturnValue({
      auth: {
        getUser: authGetUserMock,
      },
      from: vi.fn((table: string) => {
        if (table === 'restaurants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: restaurantMaybeSingle })),
            })),
          };
        }

        if (table === 'branches') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: branchMaybeSingle })),
            })),
          };
        }

        if (table === 'customer_favorite_restaurants') {
          return {
            select: vi.fn(() => ({ eq: favoriteCustomerEq })),
            insert,
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await POST(new NextRequest('http://localhost/api/favorites', {
      method: 'POST',
      headers: {
        Authorization: 'Bearer token-1',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ restaurantId: 'branch-1' }),
    }));

    expect(response.status).toBe(200);
    expect(favoriteRestaurantEq).toHaveBeenCalledWith('restaurant_id', 'restaurant-1');
    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      customer_id: 'customer-1',
      restaurant_id: 'restaurant-1',
    }));
  });

  it('resolves a branch id when checking favorite state', async () => {
    const restaurantMaybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const branchMaybeSingle = vi.fn().mockResolvedValue({ data: { restaurant_id: 'restaurant-1' }, error: null });
    const favoriteMaybeSingle = vi.fn().mockResolvedValue({ data: { restaurant_id: 'restaurant-1' }, error: null });
    const favoriteRestaurantEq = vi.fn(() => ({ maybeSingle: favoriteMaybeSingle }));
    const favoriteCustomerEq = vi.fn(() => ({ eq: favoriteRestaurantEq }));

    getSupabaseServerMock.mockReturnValue({
      auth: {
        getUser: authGetUserMock,
      },
      from: vi.fn((table: string) => {
        if (table === 'restaurants') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: restaurantMaybeSingle })),
            })),
          };
        }

        if (table === 'branches') {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: branchMaybeSingle })),
            })),
          };
        }

        if (table === 'customer_favorite_restaurants') {
          return {
            select: vi.fn(() => ({ eq: favoriteCustomerEq })),
          };
        }

        throw new Error(`Unexpected table ${table}`);
      }),
    });

    const response = await GET(new NextRequest('http://localhost/api/favorites?restaurantId=branch-1', {
      headers: {
        Authorization: 'Bearer token-1',
      },
    }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ isFavorite: true });
    expect(favoriteRestaurantEq).toHaveBeenCalledWith('restaurant_id', 'restaurant-1');
  });
});