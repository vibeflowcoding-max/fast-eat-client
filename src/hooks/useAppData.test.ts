import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAppData } from './useAppData';

const mockStore = {
  branchId: 'branch-1',
  fromNumber: '',
  isTestMode: false,
  setRestaurantInfo: vi.fn(),
  setItems: vi.fn(),
};

const fetchBranchShell = vi.fn();
const fetchBranchMenuCategories = vi.fn();
const fetchBranchMenuItems = vi.fn();
const getCartFromN8N = vi.fn();

vi.mock('../store', () => ({
  useCartStore: vi.fn(() => mockStore),
}));

vi.mock('../services/api', () => ({
  fetchBranchShell: (...args: unknown[]) => fetchBranchShell(...args),
  fetchBranchMenuCategories: (...args: unknown[]) => fetchBranchMenuCategories(...args),
  fetchBranchMenuItems: (...args: unknown[]) => fetchBranchMenuItems(...args),
  getCartFromN8N: (...args: unknown[]) => getCartFromN8N(...args),
}));

describe('useAppData', () => {
  beforeEach(() => {
    mockStore.branchId = 'branch-1';
    mockStore.fromNumber = '';
    mockStore.isTestMode = false;
    mockStore.setRestaurantInfo.mockReset();
    mockStore.setItems.mockReset();

    fetchBranchShell.mockReset().mockResolvedValue({
      restaurant: { id: 'branch-1', name: 'Sumo Sushi' },
      isTableAvailable: true,
      tableQuantity: 4,
    });
    fetchBranchMenuCategories.mockReset().mockResolvedValue([
      { id: 'category-1', name: 'Sushi' },
    ]);
    fetchBranchMenuItems.mockReset().mockResolvedValue({
      category: { id: 'category-1', name: 'Sushi' },
      nextCursor: null,
      items: [
        {
          id: 'item-1',
          name: 'Roll Dragón',
          description: 'Sushi roll',
          image: '',
          price: 4500,
        },
      ],
    });
    getCartFromN8N.mockReset().mockResolvedValue([]);
  });

  it('loads the menu even when the customer phone is missing', async () => {
    const { result } = renderHook(() => useAppData());

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });

    expect(fetchBranchShell).toHaveBeenCalledTimes(1);
    expect(fetchBranchMenuCategories).toHaveBeenCalledTimes(1);
    expect(fetchBranchMenuItems).toHaveBeenCalledTimes(1);
    expect(result.current.menuItems).toHaveLength(1);
    expect(result.current.categories).toEqual(['Sushi']);
    expect(result.current.activeCategory).toBe('Sushi');
    expect(mockStore.setRestaurantInfo).toHaveBeenCalledWith({ id: 'branch-1', name: 'Sumo Sushi' });
    expect(getCartFromN8N).not.toHaveBeenCalled();
  });
});