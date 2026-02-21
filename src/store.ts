import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuctionState, BidNotification, CartItem, DeliveryBid, UserLocation } from './types';

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
  bidsByOrderId: Record<string, DeliveryBid[]>;
  bidNotifications: BidNotification[];
  deepLinkTarget: { orderId: string; bidId: string } | null;
  auctionStateByOrderId: Record<string, AuctionState>;
  userLocation: UserLocation | null;
  isOnboarded: boolean;
  customerAddress: {
    customerId?: string;
    urlAddress: string;
    buildingType: 'Apartment' | 'Residential Building' | 'Hotel' | 'Office Building' | 'Other';
    unitDetails?: string;
    deliveryNotes: string;
    lat?: number;
    lng?: number;
    formattedAddress?: string;
    placeId?: string;
  } | null;
  profilePromptDismissedAt: number | null;
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
  setOrderBids: (orderId: string, bids: DeliveryBid[]) => void;
  addBid: (orderId: string, bid: DeliveryBid) => void;
  updateBid: (orderId: string, bidId: string, update: Partial<DeliveryBid>) => void;
  addBidNotification: (notification: BidNotification) => void;
  markBidNotificationRead: (bidId: string) => void;
  setDeepLinkTarget: (target: { orderId: string; bidId: string } | null) => void;
  setAuctionState: (orderId: string, state: AuctionState) => void;
  clearActiveOrders: () => void;
  resetSession: () => void;
  setUserLocation: (location: UserLocation | null) => void;
  setOnboarded: (value: boolean) => void;
  setCustomerAddress: (address: CartState['customerAddress']) => void;
  setProfilePromptDismissedAt: (value: number | null) => void;
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
      bidsByOrderId: {},
      bidNotifications: [],
      deepLinkTarget: null,
      auctionStateByOrderId: {},
      userLocation: null,
      isOnboarded: false,
      customerAddress: null,
      profilePromptDismissedAt: null,
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
      setBranchId: (branchId) => set((state) => {
        const normalizedNextBranchId = String(branchId || '').trim();
        const normalizedCurrentBranchId = String(state.branchId || '').trim();

        if (
          normalizedCurrentBranchId &&
          normalizedNextBranchId &&
          normalizedCurrentBranchId !== normalizedNextBranchId
        ) {
          return {
            branchId: normalizedNextBranchId,
            items: [],
            expirationTime: null,
            activeOrders: {},
            bidsByOrderId: {},
            bidNotifications: [],
            deepLinkTarget: null,
            auctionStateByOrderId: {},
          };
        }

        return { branchId: normalizedNextBranchId };
      }),
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
      setOrderBids: (orderId, bids) => set((state) => ({
        bidsByOrderId: {
          ...state.bidsByOrderId,
          [orderId]: bids
        }
      })),
      addBid: (orderId, bid) => set((state) => {
        const existing = state.bidsByOrderId[orderId] || [];
        const alreadyExists = existing.some((entry) => entry.id === bid.id);

        if (alreadyExists) {
          return {
            bidsByOrderId: {
              ...state.bidsByOrderId,
              [orderId]: existing.map((entry) => entry.id === bid.id ? bid : entry)
            }
          };
        }

        return {
          bidsByOrderId: {
            ...state.bidsByOrderId,
            [orderId]: [bid, ...existing]
          }
        };
      }),
      updateBid: (orderId, bidId, update) => set((state) => {
        const existing = state.bidsByOrderId[orderId] || [];
        return {
          bidsByOrderId: {
            ...state.bidsByOrderId,
            [orderId]: existing.map((entry) => entry.id === bidId ? { ...entry, ...update } : entry)
          }
        };
      }),
      addBidNotification: (notification) => set((state) => {
        const exists = state.bidNotifications.some((entry) => entry.id === notification.id);
        if (exists) return {};

        return {
          bidNotifications: [notification, ...state.bidNotifications].slice(0, 50)
        };
      }),
      markBidNotificationRead: (bidId) => set((state) => ({
        bidNotifications: state.bidNotifications.map((notification) =>
          notification.id === bidId ? { ...notification, read: true } : notification
        )
      })),
      setDeepLinkTarget: (target) => set({ deepLinkTarget: target }),
      setAuctionState: (orderId, stateUpdate) => set((state) => ({
        auctionStateByOrderId: {
          ...state.auctionStateByOrderId,
          [orderId]: {
            ...state.auctionStateByOrderId[orderId],
            ...stateUpdate
          }
        }
      })),
      clearActiveOrders: () => set({
        activeOrders: {},
        bidsByOrderId: {},
        bidNotifications: [],
        deepLinkTarget: null,
        auctionStateByOrderId: {}
      }),
      resetSession: () => set({
        items: [],
        expirationTime: null,
        branchId: '',
        fromNumber: '',
        customerName: '',
        activeOrders: {},
        bidsByOrderId: {},
        bidNotifications: [],
        deepLinkTarget: null,
        auctionStateByOrderId: {}
      }),
      setUserLocation: (location) => set({ userLocation: location }),
      setOnboarded: (value) => set({ isOnboarded: value }),
      setCustomerAddress: (address) => set({ customerAddress: address }),
      setProfilePromptDismissedAt: (value) => set({ profilePromptDismissedAt: value })
    }),
    {
      name: 'fasteat-storage',
      partialize: (state) => ({
        fromNumber: state.fromNumber,
        customerName: state.customerName,
        activeOrders: state.activeOrders,
        bidsByOrderId: state.bidsByOrderId,
        bidNotifications: state.bidNotifications,
        deepLinkTarget: state.deepLinkTarget,
        auctionStateByOrderId: state.auctionStateByOrderId,
        items: state.items,
        expirationTime: state.expirationTime,
        branchId: state.branchId,
        userLocation: state.userLocation,
        isOnboarded: state.isOnboarded,
        customerAddress: state.customerAddress,
        profilePromptDismissedAt: state.profilePromptDismissedAt
      }),
    }
  )
);
