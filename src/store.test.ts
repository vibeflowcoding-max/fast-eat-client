import { describe, expect, it } from 'vitest';
import { useCartStore } from './store';

describe('useCartStore auth cleanup', () => {
  it('clears persisted private and operational state on clearAuthSession', () => {
    useCartStore.setState({
      items: [{
        id: 'item-1',
        name: 'Ramen',
        description: 'Hot ramen',
        image: '',
        price: 5000,
        category: 'Soups',
        quantity: 2,
      }],
      branchId: 'branch-1',
      fromNumber: '50688888888',
      customerId: 'cust-1',
      customerName: 'Ivan',
      activeOrders: {
        'order-1': {
          orderId: 'order-1',
          orderNumber: 'A-1',
          previousStatus: { code: 'PENDING', label: 'Pending' },
          newStatus: { code: 'CREATED', label: 'Created' },
          updatedAt: new Date().toISOString(),
        },
      },
      bidNotifications: [{ id: 'bid-1', orderId: 'order-1', bidId: 'bid-1', message: 'Bid', createdAt: new Date().toISOString(), read: false }],
      customerAddress: {
        customerId: 'cust-1',
        urlAddress: 'https://maps.example/address',
        buildingType: 'Other',
        deliveryNotes: 'Meet outside',
      },
      authUserId: 'user-1',
      authEmail: 'user@example.com',
      isAuthenticated: true,
      authHydrated: true,
      clientContext: {
        favorites: ['restaurant-1'],
        recentSearches: [{ id: 'search-1', query: 'sushi', created_at: new Date().toISOString() }],
        orderHistorySummary: { total: 1, recent: [] },
        settings: { shareActivity: true, dietaryProfile: null },
      },
    });

    useCartStore.getState().clearAuthSession();

    const state = useCartStore.getState();

    expect(state.items).toEqual([]);
    expect(state.branchId).toBe('');
    expect(state.fromNumber).toBe('');
    expect(state.customerId).toBe('');
    expect(state.customerName).toBe('');
    expect(state.customerAddress).toBeNull();
    expect(state.activeOrders).toEqual({});
    expect(state.bidNotifications).toEqual([]);
    expect(state.authUserId).toBeNull();
    expect(state.authEmail).toBeNull();
    expect(state.isAuthenticated).toBe(false);
    expect(state.authHydrated).toBe(false);
    expect(state.clientContext).toBeNull();
  });
});