import { useState, useEffect, useRef, useCallback } from 'react';
import { useCartStore } from '../store';
import { fetchBranchMenuCategories, fetchBranchMenuCombos, fetchBranchMenuItems, fetchBranchShell, getCartFromN8N } from '../services/api';
import { MenuItem, CartItem, OfferCombo } from '../types';
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
  const [combos, setCombos] = useState<OfferCombo[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tableQuantity, setTableQuantity] = useState<number>(0);
  const requestCycleRef = useRef(0);
  const categoryIdByNameRef = useRef<Record<string, string>>({});
  const loadedCategoryIdsRef = useRef<Set<string>>(new Set());
  const inFlightCategoryIdsRef = useRef<Set<string>>(new Set());
  const categoryOrderRef = useRef<string[]>([]);

  const mergeMenuItems = useCallback((incomingItems: MenuItem[]) => {
    setMenuItems((previous) => {
      const merged = new Map<string, MenuItem>();

      previous.forEach((item) => {
        merged.set(String(item.id), item);
      });

      incomingItems.forEach((item) => {
        merged.set(String(item.id), item);
      });

      const categoryOrder = categoryOrderRef.current;
      return Array.from(merged.values()).sort((left, right) => {
        const leftIndex = categoryOrder.indexOf(left.category);
        const rightIndex = categoryOrder.indexOf(right.category);

        if (leftIndex !== rightIndex) {
          return (leftIndex === -1 ? Number.MAX_SAFE_INTEGER : leftIndex)
            - (rightIndex === -1 ? Number.MAX_SAFE_INTEGER : rightIndex);
        }

        return left.name.localeCompare(right.name);
      });
    });
  }, [setMenuItems]);

  const loadCategoryItems = useCallback(async (
    branch: string,
    categoryName: string,
    signal?: AbortSignal,
  ) => {
    const categoryId = categoryIdByNameRef.current[categoryName];
    if (!categoryId || loadedCategoryIdsRef.current.has(categoryId) || inFlightCategoryIdsRef.current.has(categoryId)) {
      return [] as MenuItem[];
    }

    inFlightCategoryIdsRef.current.add(categoryId);

    try {
      let cursor: string | null = null;
      const aggregatedItems: MenuItem[] = [];

      do {
        const payload = await fetchBranchMenuItems(
          branch,
          {
            categoryId,
            cursor,
            limit: 24,
            channel: 'delivery',
          },
          signal,
        );

        if (Array.isArray(payload.items) && payload.items.length > 0) {
          aggregatedItems.push(...payload.items.map((item) => ({
            ...item,
            category: payload.category?.name || categoryName,
          })));
        }

        cursor = payload.nextCursor;
      } while (cursor && !signal?.aborted);

      loadedCategoryIdsRef.current.add(categoryId);
      mergeMenuItems(aggregatedItems);

      return aggregatedItems;
    } finally {
      inFlightCategoryIdsRef.current.delete(categoryId);
    }
  }, [mergeMenuItems]);

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
    setMenuItems([]);
    setCategories([]);
    setCombos([]);
    setActiveCategory('');
    setTableQuantity(0);
    categoryIdByNameRef.current = {};
    categoryOrderRef.current = [];
    loadedCategoryIdsRef.current = new Set();
    inFlightCategoryIdsRef.current = new Set();

    try {
      const [shellResult, categoriesResult, combosResult] = await Promise.allSettled([
        fetchBranchShell(branchId, signal),
        fetchBranchMenuCategories(branchId, signal),
        fetchBranchMenuCombos(branchId, signal),
      ]);

      if (shellResult.status === 'fulfilled' && shellResult.value && isCurrentCycle()) {
        if (shellResult.value.restaurant) {
          setRestaurantInfo(shellResult.value.restaurant);
        }
        setTableQuantity(shellResult.value.isTableAvailable ? shellResult.value.tableQuantity : 0);
      } else if (shellResult.status === 'rejected' && !isAbortError(shellResult.reason)) {
        console.error('Failed to fetch branch shell', shellResult.reason);
      }

      const categorySummaries = categoriesResult.status === 'fulfilled' ? categoriesResult.value : [];
      const comboSummaries = combosResult.status === 'fulfilled' ? combosResult.value : [];
      if (categoriesResult.status === 'rejected' && !isAbortError(categoriesResult.reason)) {
        console.error('Failed to fetch menu categories', categoriesResult.reason);
      }
      if (combosResult.status === 'rejected' && !isAbortError(combosResult.reason)) {
        console.error('Failed to fetch combos', combosResult.reason);
      }

      const nextCategories = Array.isArray(categorySummaries)
        ? categorySummaries.map((category) => String(category.name || 'General'))
        : [];

      categoryIdByNameRef.current = Object.fromEntries(
        (Array.isArray(categorySummaries) ? categorySummaries : []).map((category) => [
          String(category.name || 'General'),
          String(category.id || category.name || 'general'),
        ]),
      );
      categoryOrderRef.current = nextCategories;

      if (isCurrentCycle()) {
        setCategories(nextCategories);
        setCombos(Array.isArray(comboSummaries) ? comboSummaries : []);
      }

      if (nextCategories.length === 0) {
        if (isCurrentCycle()) {
          setLoading(false);
        }
        return;
      }

      const initialCategory = nextCategories[0];
      if (isCurrentCycle()) {
        setActiveCategory(initialCategory);
      }

      let initialItems: MenuItem[] = [];
      try {
        initialItems = await loadCategoryItems(branchId, initialCategory, signal);
      } catch (e) {
        if (isAbortError(e)) {
          return;
        }

        console.error('Failed to fetch initial menu category', e);
        if (isCurrentCycle()) {
          setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
        }
      }

      if (isCurrentCycle()) {
        setLoading(false);
      }

      const remainingCategories = nextCategories.slice(1);
      if (remainingCategories.length > 0) {
        void (async () => {
          for (const categoryName of remainingCategories) {
            if (!isCurrentCycle()) {
              return;
            }

            try {
              await loadCategoryItems(branchId, categoryName, signal);
            } catch (backgroundError) {
              if (isAbortError(backgroundError)) {
                return;
              }
              console.error('Failed to fetch deferred menu category', backgroundError);
            }
          }
        })();
      }

      if (initialItems.length > 0 && fromNumber) {
        getCartFromN8N(branchId, fromNumber, isTestMode)
          .then((serverItems) => {
            if (!serverItems || !Array.isArray(serverItems) || !isCurrentCycle()) return;

            const localCart = useCartStore.getState().items;
            if (localCart.length > 0) {
              return;
            }

            const syncedCart: CartItem[] = serverItems.map((sItem: any) => {
              const itemId = sItem.item_id || sItem.id;
              const itemName = sItem.nombre || sItem.name;
              const itemPrice = sItem.precio || sItem.unit_price;
              const itemQty = sItem.cantidad || sItem.qty;
              const itemNotes = sItem.detalles || sItem.notes || '';

              const menuMatch = initialItems.find(m => String(m.id) === String(itemId))
                || useCartStore.getState().items.find(m => String(m.id) === String(itemId));
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
          .catch((e) => console.error('Failed to sync cart from server', e));
      }
    } catch (e) {
      if (isAbortError(e)) {
        return;
      }

      console.error('Fatal error during app data initialization', e);
      if (isCurrentCycle()) {
        setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
      }
    } finally {
      // Ensure loading is cleared even on unexpected errors
      if (isCurrentCycle()) {
        setLoading(false);
      }
    }
  }, [branchId, fromNumber, isTestMode, loadCategoryItems, setItems, setRestaurantInfo]);

  useEffect(() => {
    const normalizedActiveCategory = String(activeCategory || '').trim();
    const categoryId = categoryIdByNameRef.current[normalizedActiveCategory];

    if (!branchId || !normalizedActiveCategory || !categoryId || loadedCategoryIdsRef.current.has(categoryId)) {
      return;
    }

    const controller = new AbortController();
    void loadCategoryItems(branchId, normalizedActiveCategory, controller.signal).catch((loadError) => {
      if (!isAbortError(loadError)) {
        console.error('Failed to load active category', loadError);
      }
    });

    return () => {
      controller.abort();
    };
  }, [activeCategory, branchId, loadCategoryItems]);

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
    combos,
    loading,
    activeCategory,
    setActiveCategory,
    error,
    refreshData: initAppData,
    tableQuantity
  };
};
