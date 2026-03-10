import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useRestaurants } from './useRestaurants';

function createRestaurant(id: string, name: string) {
  return {
    id,
    name,
    slug: name.toLowerCase(),
    logo_url: null,
    description: null,
    is_active: true,
    rating: 4.5,
    review_count: 10,
    estimated_delivery_fee: 1000,
    promo_text: null,
    eta_min: 25,
    avg_price_estimate: 8500,
    branches: [],
    categories: [],
  };
}

describe('useRestaurants', () => {
  it('ignores stale list responses when dependencies change', async () => {
    const pending: Array<{
      resolve: (value: unknown) => void;
    }> = [];

    vi.stubGlobal('fetch', vi.fn(() => {
      return new Promise((resolve) => {
        pending.push({ resolve });
      });
    }) as typeof fetch);

    const { result, rerender } = renderHook(
      ({ categoryId }) => useRestaurants({ categoryId }),
      { initialProps: { categoryId: 'cat-1' } },
    );

    rerender({ categoryId: 'cat-2' });

    pending[1]?.resolve({
      ok: true,
      json: async () => [createRestaurant('restaurant-2', 'Sushi')],
    });

    await waitFor(() => {
      expect(result.current.restaurants[0]?.id).toBe('restaurant-2');
    });

    pending[0]?.resolve({
      ok: true,
      json: async () => [createRestaurant('restaurant-1', 'Burger House')],
    });

    await waitFor(() => {
      expect(result.current.restaurants[0]?.id).toBe('restaurant-2');
    });

    vi.unstubAllGlobals();
  });

  it('does not surface an aborted shared request as an error for a new subscriber', async () => {
    let resolveFetch: ((value: unknown) => void) | null = null;

    vi.stubGlobal('fetch', vi.fn(() => {
      return new Promise((resolve) => {
        resolveFetch = resolve;
      });
    }) as typeof fetch);

    const first = renderHook(() => useRestaurants({ categoryId: 'shared-cat' }));

    await waitFor(() => {
      expect(fetch).toHaveBeenCalledTimes(1);
    });

    first.unmount();

    const second = renderHook(() => useRestaurants({ categoryId: 'shared-cat' }));

    resolveFetch?.({
      ok: true,
      json: async () => [createRestaurant('restaurant-1', 'Burger House')],
    });

    await waitFor(() => {
      expect(second.result.current.restaurants[0]?.id).toBe('restaurant-1');
    });

    expect(second.result.current.error).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);

    first.unmount();
    second.unmount();
    vi.unstubAllGlobals();
  });
});