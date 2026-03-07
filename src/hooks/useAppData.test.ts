import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppData } from './useAppData';

const mockStore = {
  branchId: 'branch-1',
  fromNumber: '',
  isTestMode: false,
  setRestaurantInfo: vi.fn(),
  setItems: vi.fn(),
  expirationTime: null as number | null,
  setExpirationTime: vi.fn(),
};

const fetchRestaurantInfo = vi.fn();
const fetchTableQuantity = vi.fn();
const fetchMenuFromAPI = vi.fn();
const getCartFromN8N = vi.fn();

vi.mock('../store', () => ({
  useCartStore: vi.fn(() => mockStore),
}));

vi.mock('../services/api', () => ({
  fetchRestaurantInfo: (...args: unknown[]) => fetchRestaurantInfo(...args),
  fetchTableQuantity: (...args: unknown[]) => fetchTableQuantity(...args),
  fetchMenuFromAPI: (...args: unknown[]) => fetchMenuFromAPI(...args),
  getCartFromN8N: (...args: unknown[]) => getCartFromN8N(...args),
}));

describe('useAppData', () => {
  beforeEach(() => {
    mockStore.branchId = 'branch-1';
    mockStore.fromNumber = '';
    mockStore.isTestMode = false;
    mockStore.expirationTime = null;
    mockStore.setRestaurantInfo.mockReset();
    mockStore.setItems.mockReset();
    mockStore.setExpirationTime.mockReset();

    fetchRestaurantInfo.mockReset().mockResolvedValue({ id: 'branch-1', name: 'Sumo Sushi' });
    fetchTableQuantity.mockReset().mockResolvedValue({ is_available: true, quantity: 4 });
    fetchMenuFromAPI.mockReset().mockResolvedValue({
      items: [
        {
          id: 'item-1',
          name: 'Roll Dragón',
          description: 'Sushi roll',
          image: '',
          price: 4500,
          category: 'Sushi',
        },
      ],
      categories: ['Sushi'],
    });
    getCartFromN8N.mockReset().mockResolvedValue([]);
  });

  it('loads the menu even when the customer phone is missing', async () => {
    const { result } = renderHook(() => useAppData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchRestaurantInfo).toHaveBeenCalledTimes(1);
    expect(fetchTableQuantity).toHaveBeenCalledTimes(1);
    expect(fetchMenuFromAPI).toHaveBeenCalledTimes(1);
    expect(result.current.menuItems).toHaveLength(1);
    expect(result.current.categories).toEqual(['Sushi']);
    expect(result.current.activeCategory).toBe('Sushi');
    expect(getCartFromN8N).not.toHaveBeenCalled();
  });
});