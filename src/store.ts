
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from './types';

import { OrderUpdate } from './hooks/useOrderTracking';

interface CartState {
  items: CartItem[];
  expirationTime: number | null; 
  branchId: string;
  fromNumber: string;
  customerName: string;
  isTestMode: boolean; // Estado para manejar el entorno de n8n
  restaurantInfo: import('./types').RestaurantInfo | null;
  activeOrders: Record<string, OrderUpdate>;
  setItems: (items: CartItem[]) => void;
  updateItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setExpirationTime: (time: number | null) => void;
  setBranchId: (id: string) => void;
  setFromNumber: (num: string) => void;
  setCustomerName: (name: string) => void;
  toggleTestMode: () => void;
  setRestaurantInfo: (info: import('./types').RestaurantInfo) => void;
  addActiveOrder: (order: OrderUpdate) => void;
  updateActiveOrder: (orderId: string, updates: Partial<OrderUpdate>) => void;
  clearActiveOrders: () => void;
  resetSession: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      expirationTime: null,
      branchId: '',
      fromNumber: '',
      customerName: '',
      isTestMode: false,
      restaurantInfo: null,
      activeOrders: {},
      setItems: (items) => set({ items }),
      updateItem: (newItem) => set((state) => {
        const existingIndex = state.items.findIndex((i) => i.id === newItem.id);
        if (existingIndex > -1) {
          const newItems = [...state.items];
          newItems[existingIndex] = newItem;
          return { items: newItems };
        }
        return { items: [...state.items, newItem] };
      }),
      removeItem: (itemId) => set((state) => ({
        items: state.items.filter((i) => i.id !== itemId)
      })),
      clearCart: () => set({ items: [], expirationTime: null }),
      setExpirationTime: (time) => set({ expirationTime: time }),
      setBranchId: (branchId) => set({ branchId }),
      setFromNumber: (fromNumber) => set({ fromNumber }),
      setCustomerName: (name) => set({ customerName: name }),
      toggleTestMode: () => set((state) => ({ isTestMode: !state.isTestMode })),
      setRestaurantInfo: (info) => set({ restaurantInfo: info }),
      addActiveOrder: (order) => set((state) => {
        // Find if we already have this order by ID or by human-readable Order Number
        const existingKey = Object.keys(state.activeOrders).find(key => 
          key === order.orderId || 
          (order.orderNumber !== 'PENDING' && state.activeOrders[key].orderNumber === order.orderNumber)
        );

        const newActiveOrders = { ...state.activeOrders };
        
        // If it existed with a different key, remove the old one to avoid duplicates
        if (existingKey && existingKey !== order.orderId) {
          delete newActiveOrders[existingKey];
        }

        // Deep merge: preserve items and total if they are missing in the new update
        const existingData = (existingKey ? state.activeOrders[existingKey] : {}) as Partial<OrderUpdate>;
        newActiveOrders[order.orderId] = {
          ...existingData,
          ...order,
          items: order.items || existingData.items, // Keep old items if update is empty
          total: order.total || existingData.total  // Keep old total if update is empty
        } as OrderUpdate;

        return { activeOrders: newActiveOrders };
      }),
      updateActiveOrder: (orderId, updates) => set((state) => {
        if (!state.activeOrders[orderId]) return {};
        return {
          activeOrders: {
            ...state.activeOrders,
            [orderId]: { ...state.activeOrders[orderId], ...updates }
          }
        };
      }),
      clearActiveOrders: () => set({ activeOrders: {} }),
      resetSession: () => set({ 
        items: [], 
        expirationTime: null, 
        fromNumber: '', 
        customerName: '', 
        activeOrders: {} 
      })
    }),
    {
      name: 'virtual-menu-storage',
      partialize: (state) => ({
        fromNumber: state.fromNumber,
        customerName: state.customerName,
        activeOrders: state.activeOrders,
        items: state.items,
        expirationTime: state.expirationTime,
        branchId: state.branchId
      }),
    }
  )
);
