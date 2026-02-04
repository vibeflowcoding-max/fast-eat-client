import { useEffect, useState } from 'react';
import { CartItem } from '../types';
import { useCartStore } from '../store';

export interface OrderUpdate {
  orderId: string;
  orderNumber: string;
  previousStatus: { code: string; label: string };
  newStatus: { code: string; label: string };
  updatedAt: string;
  items?: CartItem[];
  total?: number;
}

export function useOrderTracking(branchId: string, phone: string) {
  // Use global store instead of local state
  const { activeOrders, addActiveOrder } = useCartStore();
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!phone) {
        console.debug("🕵️ SSE: No phone provided, skipping connection.");
        return;
    }

    console.log(`📡 SSE: Attempting connection for phone: ${phone}`);
    // Use local proxy to hide backend URL and Branch ID
    const url = `/api/track?phone=${encodeURIComponent(phone)}`;
    
    // SSE connection
    const eventSource = new EventSource(url);

    // Generic handler for any event data
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data === 'ping' || event.data === 'heartbeat') return;

      try {
        const payload = JSON.parse(event.data);
        const data = payload.data || payload; 
        
        console.debug('📥 SSE Received Data:', data);

        if (data && (data.orderId || data.id)) {
            const id = data.orderId || data.id;
            const orderUpdate: OrderUpdate = {
                orderId: id,
                orderNumber: data.orderNumber || 'PENDING',
                previousStatus: data.previousStatus || { code: 'UNKNOWN', label: 'Desconocido' },
                newStatus: data.newStatus || { code: data.status || 'UNKNOWN', label: data.status || 'Actualizado' },
                updatedAt: data.updatedAt || new Date().toISOString(),
                items: data.items,
                total: data.total
            };
            addActiveOrder(orderUpdate);
        }
      } catch (e) {
        console.warn("⚠️ SSE Parse Error:", e, event.data);
      }
    };

    eventSource.onopen = () => {
      setIsConnected(true);
      console.log("🟢 SSE: Connection Established");
    };
    
    eventSource.onmessage = handleMessage;
    eventSource.addEventListener('order_update', handleMessage);
    eventSource.addEventListener('status_change', handleMessage);

    eventSource.onerror = (e) => {
      console.error("🔴 SSE: Connection Error", e);
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false);
      }
    };

    return () => {
      console.log("🔌 SSE: Closing connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, [phone, addActiveOrder]);

  return { 
    orders: (Object.values(activeOrders) as OrderUpdate[]).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()), 
    isConnected 
  };
}
