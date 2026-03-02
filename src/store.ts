import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { AuctionState, BidNotification, CartItem, DeliveryBid, UserLocation } from './types';
import { AppLocale, DEFAULT_LOCALE, normalizeLocale } from '@/i18n/config';

import { OrderUpdate } from './hooks/useOrderTracking';

interface CartState {
  items: CartItem[];
  expirationTime: number | null;
  branchId: string;
  fromNumber: string;
  customerId: string;
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
  dietaryProfile: import('./types').DietaryProfile | null;
  authUserId: string | null;
  authEmail: string | null;
  isAuthenticated: boolean;
  authHydrated: boolean;
  locale: AppLocale;
  clientContext: {
    favorites: string[];
    recentSearches: Array<{ id: string; query: string; created_at: string }>;
    orderHistorySummary: { total: number; recent: any[] } | null;
    settings: { shareActivity: boolean; dietaryProfile: any } | null;
  } | null;

  // Group Cart State
  groupSessionId: string | null;
  isHost: boolean;
  participantId: string | null;
  participantName: string | null;
  groupParticipants: import('./types').GroupCartParticipant[];
  setGroupSession: (sessionId: string, isHost: boolean, participantId: string, participantName: string) => void;
  updateGroupParticipants: (participants: import('./types').GroupCartParticipant[]) => void;
  leaveGroupSession: () => void;

  // Social Settings
  shareActivity: boolean;
  toggleShareActivity: (share: boolean) => void;

  setItems: (items: CartItem[]) => void;
  updateItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  clearCart: () => void;
  setExpirationTime: (time: number | null) => void;
  setBranchId: (id: string) => void;
  setFromNumber: (num: string) => void;
  setCustomerId: (id: string) => void;
  setCustomerName: (name: string) => void;
  toggleTestMode: () => void;
  setRestaurantInfo: (info: import('./types').RestaurantInfo) => void;
  addActiveOrder: (order: OrderUpdate) => void;
  replaceActiveOrders: (orders: OrderUpdate[]) => void;
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
  setDietaryProfile: (profile: import('./types').DietaryProfile | null) => void;
  setAuthSession: (payload: { userId: string; email: string | null }) => void;
  clearAuthSession: () => void;
  setAuthHydrated: (value: boolean) => void;
  setLocale: (locale: AppLocale) => void;
  hydrateClientContext: (payload: {
    customerId?: string | null;
    customerName?: string | null;
    customerPhone?: string | null;
    customerAddress?: CartState['customerAddress'];
    favorites?: string[];
    recentSearches?: Array<{ id: string; query: string; created_at: string }>;
    orderHistorySummary?: { total: number; recent: any[] } | null;
    settings?: { shareActivity: boolean; dietaryProfile: any } | null;
  }) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      expirationTime: null,
      branchId: '',
      fromNumber: '',
      customerId: '',
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
      dietaryProfile: null,
      authUserId: null,
      authEmail: null,
      isAuthenticated: false,
      authHydrated: false,
      locale: DEFAULT_LOCALE,
      clientContext: null,

      // Group Cart Initial State
      groupSessionId: null,
      isHost: false,
      participantId: null,
      participantName: null,
      groupParticipants: [],

      // Social Settings Initial State
      shareActivity: false,
      toggleShareActivity: (share) => set({ shareActivity: share }),

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

      // Group Cart Actions
      setGroupSession: (sessionId, isHost, participantId, participantName) => set({
        groupSessionId: sessionId,
        isHost,
        participantId,
        participantName,
        groupParticipants: [{
          id: participantId,
          name: participantName,
          isHost,
          items: [],
          joinedAt: Date.now()
        }]
      }),
      updateGroupParticipants: (participants) => set({ groupParticipants: participants }),
      leaveGroupSession: () => set({
        groupSessionId: null,
        isHost: false,
        participantId: null,
        participantName: null,
        groupParticipants: [],
        items: []
      }),

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
      setCustomerId: (customerId) => set({ customerId }),
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
      replaceActiveOrders: (orders) => set(() => {
        const nextActiveOrders: Record<string, OrderUpdate> = {};

        for (const order of orders) {
          if (!order?.orderId) continue;
          nextActiveOrders[order.orderId] = order;
        }

        return {
          activeOrders: nextActiveOrders,
          bidsByOrderId: {},
          bidNotifications: [],
          deepLinkTarget: null,
          auctionStateByOrderId: {}
        };
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
        customerId: '',
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
      setProfilePromptDismissedAt: (value) => set({ profilePromptDismissedAt: value }),
      setDietaryProfile: (profile) => set({ dietaryProfile: profile }),
      setAuthSession: ({ userId, email }) => set({
        authUserId: userId,
        authEmail: email,
        isAuthenticated: true,
      }),
      clearAuthSession: () => set({
        authUserId: null,
        authEmail: null,
        isAuthenticated: false,
        clientContext: null,
      }),
      setAuthHydrated: (value) => set({ authHydrated: value }),
      setLocale: (locale) => set({ locale: normalizeLocale(locale) }),
      hydrateClientContext: (payload) => set((state) => ({
        customerId: payload.customerId ?? payload.customerAddress?.customerId ?? state.customerId,
        customerName: payload.customerName ?? state.customerName,
        fromNumber: payload.customerPhone ?? state.fromNumber,
        customerAddress: payload.customerAddress ?? state.customerAddress,
        clientContext: {
          favorites: payload.favorites ?? state.clientContext?.favorites ?? [],
          recentSearches: payload.recentSearches ?? state.clientContext?.recentSearches ?? [],
          orderHistorySummary: payload.orderHistorySummary ?? state.clientContext?.orderHistorySummary ?? null,
          settings: payload.settings ?? state.clientContext?.settings ?? null,
        },
      })),
    }),
    {
      name: 'fasteat-storage',
      partialize: (state) => ({
        fromNumber: state.fromNumber,
        customerId: state.customerId,
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
        profilePromptDismissedAt: state.profilePromptDismissedAt,
        authUserId: state.authUserId,
        authEmail: state.authEmail,
        isAuthenticated: state.isAuthenticated,
        locale: state.locale,
        clientContext: state.clientContext
      }),
    }
  )
);
