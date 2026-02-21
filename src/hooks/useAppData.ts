import { useState, useEffect } from 'react';
import { useCartStore } from '../store';
import { fetchMenuFromAPI, fetchRestaurantInfo, getCartFromN8N, fetchTableQuantity } from '../services/api';
import { MenuItem, CartItem } from '../types';
import { APP_CONSTANTS } from '../constants';

export const useAppData = () => {
  const {
    branchId,
    fromNumber,
    isTestMode,
    setRestaurantInfo,
    setItems,
    expirationTime,
    setExpirationTime,
  } = useCartStore();

  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [tableQuantity, setTableQuantity] = useState<number>(0);

  const initAppData = async () => {
    if (!branchId || branchId === ':branchId' || branchId === 'undefined') {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Load Restaurant Info (CRITICAL)
      try {
        const info = await fetchRestaurantInfo(branchId);
        if (info) {
          setRestaurantInfo(info);
        }
      } catch (e) {
        console.error("Failed to fetch restaurant info", e);
      }

      // 2. Load Table Quantity (Optional/Non-blocking)
      try {
        const tableData = await fetchTableQuantity(branchId);
        if (tableData && tableData.is_available && tableData.quantity > 0) {
          setTableQuantity(tableData.quantity);
        }
      } catch (e) {
        console.error("Failed to fetch table quantity", e);
      }

      if (!fromNumber) {
        setLoading(false);
        return;
      }

      // 3. Load Menu and Categories (CRITICAL)
      let items: MenuItem[] = [];
      let apiCategories: string[] = [];
      try {
        const menuResult = await fetchMenuFromAPI(branchId);
        items = menuResult.items;
        apiCategories = menuResult.categories;
        
        setMenuItems(items);
        const cats = apiCategories.length > 0 ? apiCategories : Array.from(new Set(items.map(i => i.category)));
        setCategories(cats);
        if (items.length > 0) setActiveCategory(apiCategories[0] || items[0].category);
      } catch (e) {
        console.error("Failed to fetch menu items", e);
        setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
      }

      // 4. Sync Initial Cart from Server (Optional/Non-blocking)
      if (items.length > 0) {
        try {
          const serverItems = await getCartFromN8N(branchId, fromNumber, isTestMode);
          if (serverItems && Array.isArray(serverItems)) {
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
              if (!expirationTime) {
                setExpirationTime(Date.now() + 40 * 60 * 1000);
              }
            }
          }
        } catch (e) {
          console.error("Failed to sync cart from server", e);
        }
      }
    } catch (e) {
      console.error("Fatal error during app data initialization", e);
      setError(APP_CONSTANTS.MESSAGES.LOAD_ERROR);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    initAppData();
  }, [fromNumber, branchId, isTestMode]);

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
