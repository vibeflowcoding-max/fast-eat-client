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
        notes: '',
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
      bidNotifications: [{ id: 'bid-1', orderId: 'order-1', bid: { id: 'bid-1', bidAmount: 1200, driverRating: 4.7, estimatedTimeMinutes: 20, driverNotes: null, basePrice: 1000, status: 'ACTIVE', expiresAt: new Date().toISOString(), createdAt: new Date().toISOString() }, receivedAt: new Date().toISOString(), read: false }],
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

  it('persists active cart context without auth session fields', () => {
    useCartStore.setState({
      items: [{
        id: 'combo:combo-1',
        name: 'Toyisan Combo',
        description: 'Combo',
        image: '',
        price: 7600,
        category: 'Combos',
        quantity: 1,
        notes: '',
        sourceType: 'combo',
        comboId: 'combo-1',
      }],
      branchId: 'branch-1',
      fromNumber: '50688888888',
      customerId: 'cust-1',
      customerName: 'Ivan',
      isOnboarded: true,
      customerAddress: {
        customerId: 'cust-1',
        urlAddress: 'https://maps.example/address',
        buildingType: 'Other',
        deliveryNotes: 'Meet outside',
      },
      restaurantInfo: {
        id: 'branch-1',
        name: 'Toyisan',
        description: 'Japanese food',
        category: 'Japanese',
        address: 'San Jose',
        phone: '2222-2222',
        email: 'toyisan@example.com',
        rating: 4.7,
        image_url: '',
        google_maps_url: '',
        opening_hours: {},
        payment_methods: ['cash'],
        service_modes: ['pickup'],
        active: true,
        created_at: '2026-03-18T00:00:00.000Z',
        updated_at: '2026-03-18T00:00:00.000Z',
      },
      checkoutDraft: {
        customerName: 'Ivan',
        customerPhone: '50688888888',
        paymentMethod: 'cash',
        orderType: 'pickup',
        source: 'client',
        promoCode: 'TOYI26',
      },
      authUserId: 'user-1',
      authEmail: 'user@example.com',
      isAuthenticated: true,
      authHydrated: true,
      clientContext: {
        favorites: ['restaurant-1'],
        recentSearches: [],
        orderHistorySummary: { total: 1, recent: [] },
        settings: { shareActivity: true, dietaryProfile: null },
      },
    });

    const persistOptions = (useCartStore as typeof useCartStore & {
      persist: { getOptions: () => { partialize: (state: ReturnType<typeof useCartStore.getState>) => unknown } };
    }).persist.getOptions();
    const persisted = persistOptions.partialize(useCartStore.getState()) as Record<string, unknown>;

    expect(persisted.items).toEqual(useCartStore.getState().items);
    expect(persisted.branchId).toBe('branch-1');
    expect(persisted.checkoutDraft).toMatchObject({
      customerName: 'Ivan',
      customerPhone: '50688888888',
      orderType: 'pickup',
      promoCode: 'TOYI26',
    });
    expect(persisted.restaurantInfo).toMatchObject({ id: 'branch-1', name: 'Toyisan' });
    expect(persisted).not.toHaveProperty('authUserId');
    expect(persisted).not.toHaveProperty('authEmail');
    expect(persisted).not.toHaveProperty('isAuthenticated');
    expect(persisted).not.toHaveProperty('clientContext');
  });
});