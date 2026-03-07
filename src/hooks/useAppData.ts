import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore } from '../store';
import { fetchMenuFromAPI, fetchRestaurantInfo, getCartFromN8N, fetchTableQuantity } from '../services/api';
import { MenuItem, CartItem } from '../types';
import { APP_CONSTANTS } from '../constants';

const isAbortError = (error: unknown) => {
  return error instanceof DOMException && error.name === 'AbortError';
};

export const useAppData = () => {
  const {
    branchId,
    fromNumber,
    isTestMode,
    setRestaurantInfo,
    setItems,
  } = useCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tableQuantity, setTableQuantity] = useState<number>(0);
  const requestCycleRef = useRef(0);

  const initAppData = useCallback(async (signal?: AbortSignal) => {
    const cycle = Date.now();
    requestCycleRef.current = cycle;
    const isCurrentCycle = () => requestCycleRef.current === cycle && !signal?.aborted;

    if (!branchId || branchId === ':branchId' || branchId === 'undefined') {
      if (isCurrentCycle()) {
        setLoading(false);
      }
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Step A: parallel — restInfo and tableQty are independent, run together
      const [infoResult, tableResult] = await Promise.allSettled([
        fetchRestaurantInfo(branchId, signal),
        fetchTableQuantity(branchId, signal),
      ]);

      if (infoResult.status === 'fulfilled' && infoResult.value && isCurrentCycle()) {
        setRestaurantInfo(infoResult.value);
      } else if (infoResult.status === 'rejected' && !isAbortError(infoResult.reason)) {
        console.error("Failed to fetch restaurant info", infoResult.reason);
      }

      if (tableResult.status === 'fulfilled' && tableResult.value?.is_available && tableResult.value.quantity > 0 && isCurrentCycle()) {
        setTableQuantity(tableResult.value.quantity);
      } else if (tableResult.status === 'rejected' && !isAbortError(tableResult.reason)) {
        console.error("Failed to fetch table quantity", tableResult.reason);
      }

      // Step B: critical path — fetch menu (unblocks UI immediately after)
      let items: MenuItem[] = [];
      let apiCategories: string[] = [];
      try {
        const menuResult = await fetchMenuFromAPI(branchId, signal);
        items = menuResult.items;
        apiCategories = menuResult.categories;

        if (!isCurrentCycle()) {
          return;
        }

        setMenuItems(items);
        const cats = apiCategories.length > 0 ? apiCategories : Array.from(new Set(items.map(i => i.category)));
        setCategories(cats);
        if (items.length > 0) setActiveCategory(apiCategories[0] || items[0].category);
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }

        console.error("Failed to fetch menu items", e);
        if (isCurrentCycle()) {
          setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
        }
      }

      // Step C: fire-and-forget cart sync — runs in background, never stalls the menu
      if (items.length > 0 && fromNumber) {
        getCartFromN8N(branchId, fromNumber, isTestMode)
          .then((serverItems) => {
            if (!serverItems || !Array.isArray(serverItems) || !isCurrentCycle()) return;
            const syncedCart: CartItem[] = serverItems.map((sItem: any) => {
              const itemId = sItem.item_id || sItem.id;
              const itemName = sItem.nombre || sItem.name;
              const itemPrice = sItem.precio || sItem.unit_price;
              const itemQty = sItem.cantidad || sItem.qty;
              const itemNotes = sItem.detalles || sItem.notes || '';

              const menuMatch = items.find(m => String(m.id) === String(itemId));
              return {
                ...(menuMatch || {
                  id: itemId,
                  name: itemName,
                  description: 'Platillo guardado anteriormente.',
                  price: itemPrice,
                  category: sItem.category || 'General',
                  image: ''
                }),
                quantity: Number(itemQty) || 1,
                notes: itemNotes
              };
            });

            if (syncedCart.length > 0) {
              setItems(syncedCart);
            }
          })
          .catch((e) => console.error("Failed to sync cart from server", e));
      }
    } catch (e) {
      if (isAbortError(e)) {
        return;
      }

      console.error("Fatal error during app data initialization", e);
      if (isCurrentCycle()) {
        setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
      }
    } finally {
      // Ensure loading is cleared even on unexpected errors
      if (isCurrentCycle()) {
        setLoading(false);
      }
    }
  }, [branchId, fromNumber, isTestMode, setItems, setRestaurantInfo]);

  useEffect(() => {
    const controller = new AbortController();
    initAppData(controller.signal);

    return () => {
      controller.abort();
    };
  }, [initAppData]);

  return {
    menuItems,
    categories,
    loading,
    activeCategory,
    setActiveCategory,
    error,
    refreshData: initAppData,
    tableQuantity
  };
};
