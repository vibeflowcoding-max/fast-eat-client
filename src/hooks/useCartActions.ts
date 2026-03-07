import { useState, useRef } from 'react';
import { useCartStore } from '../store';
import { sendChatToN8N, submitOrderToMCP, CartAction, saveOrderSplitDraft } from '../services/api';
import { CartItem, OrderMetadata } from '../types';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';
import { getAuthenticatedJsonHeaders } from '@/lib/client-auth';

export const useCartActions = () => {
  const {
    items: cart,
    branchId,
    fromNumber,
    isTestMode,
    updateItem,
    removeItem,
    clearCart,
    addActiveOrder,
    customerAddress,
    setCustomerAddress,
    setCustomerId,
    customerName,
    isAuthenticated,
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
          setChefNotification({ content: response.output, item_ids: response.item_ids });
        } else {
          setChefNotification({ content: "Lo sentimos, hubo un problema al sincronizar. 🏮" });
        }
      } catch {
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
        setChefNotification({ content: res.output, item_ids: res.item_ids });
        return true;
      } else {
        setChefNotification({ content: "Error en el servidor. 🏮" });
        return false;
      }
    } catch {
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
    } catch {
      setChefNotification({ content: "Error de red al vaciar el carrito." });
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  const handlePlaceOrder = async (effectiveCart: CartItem[], orderMetadata: OrderMetadata, cartTotal: number): Promise<boolean> => {
    if (isOrdering) return false;
    setIsOrdering(true);
    try {
      const normalizedCustomerPhone = normalizePhoneWithSinglePlus(fromNumber || orderMetadata.customerPhone || '');
      const canonicalCustomerName = String(customerName || orderMetadata.customerName || '').trim();
      const deliveryLocationReference = String(orderMetadata.gpsLocation || orderMetadata.address || '').trim();

      if (orderMetadata.orderType === 'delivery' && !deliveryLocationReference) {
        setChefNotification({ content: 'Debes proporcionar una ubicación para pedidos a domicilio. 📍' });
        return false;
      }

      const finalMetadata = {
        ...orderMetadata,
        customerName: canonicalCustomerName,
        customerPhone: normalizedCustomerPhone,
        address: orderMetadata.gpsLocation
          ? `${orderMetadata.address?.trim() || ''}\n\n📍 Ubicación GPS (Link):\n${orderMetadata.gpsLocation}`
          : orderMetadata.address
      };

      const hasPersistedProfileLocation = Boolean(customerAddress?.urlAddress && customerAddress.urlAddress.trim());

      if (orderMetadata.orderType === 'delivery' && !hasPersistedProfileLocation) {
        const urlAddress = String(orderMetadata.gpsLocation || orderMetadata.address || '').trim();

        if (!urlAddress) {
          setChefNotification({ content: 'Debes proporcionar una ubicación para pedidos a domicilio. 📍' });
          return false;
        }

        const headers = await getAuthenticatedJsonHeaders();

        const saveAddressResponse = await fetch('/api/customer/address', {
          method: 'POST',
          headers,
          body: JSON.stringify({
            urlAddress,
            buildingType: 'Other',
            unitDetails: null,
            deliveryNotes: String(orderMetadata.address || '').trim() || 'Meet at door',
            lat: typeof orderMetadata.customerLatitude === 'number' ? orderMetadata.customerLatitude : undefined,
            lng: typeof orderMetadata.customerLongitude === 'number' ? orderMetadata.customerLongitude : undefined,
            formattedAddress: String(orderMetadata.address || '').trim() || undefined,
          }),
        });

        if (saveAddressResponse.ok) {
          const saveAddressPayload = await saveAddressResponse.json();
          const savedAddress = saveAddressPayload?.address;

          if (savedAddress && typeof savedAddress === 'object' && typeof savedAddress.url_address === 'string') {
            setCustomerAddress({
              customerId: typeof savedAddress.customer_id === 'string' ? savedAddress.customer_id : undefined,
              urlAddress: savedAddress.url_address,
              buildingType: savedAddress.building_type,
              unitDetails: typeof savedAddress.unit_details === 'string' ? savedAddress.unit_details : undefined,
              deliveryNotes: typeof savedAddress.delivery_notes === 'string' ? savedAddress.delivery_notes : 'Meet at door',
              lat: typeof savedAddress.lat === 'number' ? savedAddress.lat : undefined,
              lng: typeof savedAddress.lng === 'number' ? savedAddress.lng : undefined,
              formattedAddress: typeof savedAddress.formatted_address === 'string' ? savedAddress.formatted_address : undefined,
              placeId: typeof savedAddress.place_id === 'string' ? savedAddress.place_id : undefined,
            });
          }
        }
      }

      const orderResult = await submitOrderToMCP(effectiveCart, finalMetadata, branchId, fromNumber);
      const orderId = orderResult?.order_id || orderResult?.orderId || orderResult?.data?.order_id || orderResult?.data?.orderId;
      const nestedOrder = orderResult?.data?.order || orderResult?.order || null;
      const resolvedOrderId = orderId || nestedOrder?.id || null;
      const resolvedCustomerId =
        orderResult?.customer_id ||
        orderResult?.customerId ||
        orderResult?.customer?.id ||
        orderResult?.data?.customer_id ||
        orderResult?.data?.customerId ||
        orderResult?.data?.customer?.id ||
        orderResult?.data?.order?.customer_id ||
        orderResult?.data?.order?.customerId ||
        nestedOrder?.customer_id ||
        nestedOrder?.customerId;
      const orderNumber =
        orderResult?.order_number ||
        orderResult?.orderNumber ||
        orderResult?.data?.order_number ||
        orderResult?.data?.orderNumber ||
        nestedOrder?.order_number ||
        nestedOrder?.orderNumber ||
        `ORD-${Date.now().toString().slice(-4)}`;
      const resolvedCustomerTotal =
        orderResult?.customer_total ||
        orderResult?.customerTotal ||
        orderResult?.financials?.customer_total ||
        orderResult?.financials?.customerTotal ||
        orderResult?.data?.customer_total ||
        orderResult?.data?.customerTotal ||
        orderResult?.data?.financials?.customer_total ||
        orderResult?.data?.financials?.customerTotal;
      const normalizedCustomerTotal =
        Number.isFinite(Number(resolvedCustomerTotal))
          ? Number(resolvedCustomerTotal)
          : cartTotal;

      if (resolvedOrderId) {
        if (typeof resolvedCustomerId === 'string' && resolvedCustomerId.trim()) {
          setCustomerId(resolvedCustomerId.trim());
        }

        if (isAuthenticated && orderMetadata.splitDraft) {
          try {
            await saveOrderSplitDraft(resolvedOrderId, orderMetadata.splitDraft);
          } catch (splitError) {
            console.warn('Could not persist split draft after order creation', splitError);
          }
        }

        addActiveOrder({
          orderId: resolvedOrderId,
          orderNumber,
          previousStatus: { code: 'PENDING', label: 'Procesando' },
          newStatus: { code: 'PENDING', label: 'Enviado a Cocina' },
          updatedAt: new Date().toISOString(),
          items: [...effectiveCart],
          total: normalizedCustomerTotal
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
