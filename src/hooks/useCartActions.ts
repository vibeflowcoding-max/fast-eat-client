import { useState, useRef } from 'react';
import { useCartStore } from '../store';
import { sendChatToN8N, submitOrderToMCP, CartAction } from '../services/api';
import { CartItem, OrderMetadata } from '../types';

export const useCartActions = () => {
  const {
    items: cart,
    branchId,
    fromNumber,
    isTestMode,
    expirationTime,
    setExpirationTime,
    updateItem,
    removeItem,
    clearCart,
    addActiveOrder
  } = useCartStore();

  const [isSyncing, setIsSyncing] = useState(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [chefNotification, setChefNotification] = useState<{ content: string; item_ids?: any[] } | null>(null);

  const debounceTimers = useRef<Record<string, NodeJS.Timeout>>({});

  const syncCartAction = async (item: CartItem, action: CartAction, newQuantity: number, orderMetadata: OrderMetadata) => {
    if (action === 'remove' || newQuantity <= 0) {
      removeItem(item.id);
    } else {
      updateItem({ ...item, quantity: newQuantity });
    }

    if (debounceTimers.current[item.id]) {
      clearTimeout(debounceTimers.current[item.id]);
    }

    debounceTimers.current[item.id] = setTimeout(async () => {
      setIsSyncing(true);
      try {
        const message = action === 'remove' || newQuantity <= 0
          ? `Remover ${item.name}`
          : `Actualizar ${item.name} a ${newQuantity} unidades`;

        const currentCart = useCartStore.getState().items;
        const response = await sendChatToN8N(message, currentCart, branchId, fromNumber, 'carrito', action, { ...item, quantity: newQuantity }, orderMetadata, isTestMode);

        if (response.confirmation) {
          if (!expirationTime) setExpirationTime(Date.now() + 40 * 60 * 1000);
          setChefNotification({ content: response.output, item_ids: response.item_ids });
        } else {
          setChefNotification({ content: "Lo sentimos, hubo un problema al sincronizar. 🏮" });
        }
      } catch (error) {
        setChefNotification({ content: "Error de conexión. 🏮" });
      } finally {
        setIsSyncing(false);
        delete debounceTimers.current[item.id];
      }
    }, 600);

    return true; 
  };

  const addToCart = async (newItem: CartItem, orderMetadata: OrderMetadata): Promise<boolean> => {
    let action: CartAction = 'add';
    let message = '';
    const existing = cart.find(i => i.id === newItem.id);
    
    if (!existing) {
      action = 'add';
      message = `Añadir ${newItem.quantity} de ${newItem.name} al carrito`;
      updateItem(newItem);
    } else {
      if (newItem.quantity === 0) { 
        action = 'remove'; 
        message = `Remover ${newItem.name}`; 
        removeItem(newItem.id);
      }
      else if (newItem.quantity !== existing.quantity) { 
        action = 'increment'; 
        message = `Actualizar ${newItem.name} a ${newItem.quantity}`; 
        updateItem(newItem);
      }
      else if (newItem.notes !== existing.notes) { 
        action = 'details'; 
        message = `Notas para ${newItem.name}: ${newItem.notes}`; 
        updateItem(newItem);
      }
      else return true;
    }

    setIsSyncing(true);
    try {
      const res = await sendChatToN8N(message, useCartStore.getState().items, branchId, fromNumber, 'carrito', action, newItem, orderMetadata, isTestMode);
      if (res.confirmation) {
        if (!expirationTime) setExpirationTime(Date.now() + 40 * 60 * 1000);
        setChefNotification({ content: res.output, item_ids: res.item_ids });
        return true;
      } else {
        setChefNotification({ content: "Error en el servidor. 🏮" });
        return false;
      }
    } catch (e) {
      setChefNotification({ content: "Error de conexión. 🏮" });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handleClearCart = async (orderMetadata: OrderMetadata) => {
    setIsSyncing(true);
    try {
      const res = await sendChatToN8N("Vaciar carrito por completo", cart, branchId, fromNumber, 'delete_cart', 'clear', undefined, orderMetadata, isTestMode);
      if (res.confirmation) {
        clearCart();
        setChefNotification({ content: res.output || "Se eliminó por completo el carrito. 🍱", item_ids: res.item_ids });
        return true;
      } else {
        setChefNotification({ content: "No se pudo vaciar el carrito." });
        return false;
      }
    } catch (e) {
      setChefNotification({ content: "Error de red al vaciar el carrito." });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePlaceOrder = async (orderMetadata: OrderMetadata, cartTotal: number): Promise<boolean> => {
    if (isOrdering) return false;
    setIsOrdering(true);
    try {
      const finalMetadata = {
        ...orderMetadata,
        address: orderMetadata.gpsLocation
          ? `${orderMetadata.address?.trim() || ''}\n\n📍 Ubicación GPS (Link):\n${orderMetadata.gpsLocation}`
          : orderMetadata.address
      };

      const orderResult = await submitOrderToMCP(cart, finalMetadata, branchId);
      const orderId = orderResult?.order_id || orderResult?.orderId || orderResult?.data?.order_id || orderResult?.data?.orderId;
      const orderNumber =
        orderResult?.order_number ||
        orderResult?.orderNumber ||
        orderResult?.data?.order_number ||
        orderResult?.data?.orderNumber ||
        `ORD-${Date.now().toString().slice(-4)}`;

      if (orderId) {
          addActiveOrder({
            orderId,
            orderNumber,
            previousStatus: { code: 'PENDING', label: 'Procesando' },
            newStatus: { code: 'PENDING', label: 'Enviado a Cocina' },
            updatedAt: new Date().toISOString(),
            items: [...cart],
            total: cartTotal
          });

        setChefNotification({ content: "¡Tu pedido ha sido creado con éxito! 🍣✨" });
        clearCart();
        return true;
      }

      const errorMsg = orderResult?.message || "No se pudo procesar la orden. 🏮";
      setChefNotification({ content: errorMsg });
      return false;
    } catch (error: any) {
      console.error("Order error:", error);
      if (error.message?.includes('504')) {
        setChefNotification({ 
          content: "⚠️ El servidor está tardando mucho. Es probable que tu orden se esté procesando. Por favor, espera 1 minuto antes de intentar de nuevo o revisa tus pedidos activos. ⛩️" 
        });
      } else {
        setChefNotification({ content: "🏮 Error de red al procesar tu pedido. Por favor, verifica tu conexión e intenta de nuevo." });
      }
      return false;
    } finally {
      setIsOrdering(false);
    }
  };

  return {
    isSyncing,
    isOrdering,
    chefNotification,
    setChefNotification,
    syncCartAction,
    addToCart,
    handleClearCart,
    handlePlaceOrder
  };
};
