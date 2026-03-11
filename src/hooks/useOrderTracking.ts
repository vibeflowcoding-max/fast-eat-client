import { useEffect, useMemo, useRef, useState } from 'react';
import { CartItem, DeliveryBid } from '../types';
import { useCartStore } from '../store';
import { audioManager } from '@/lib/audio';

export interface OrderUpdate {
  orderId: string;
  orderNumber: string;
  previousStatus: { code: string; label: string; description?: string | null };
  newStatus: { code: string; label: string; description?: string | null };
  updatedAt: string;
  items?: CartItem[];
  total?: number;
  subtotal?: number;
  feesTotal?: number;
  deliveryFee?: number;
  customerTotal?: number;
  source?: string;
  securityCode?: string;
  deliveryFinalPrice?: number;
  deliveryId?: string;
  confirmedByDelivery?: boolean;
  acceptedByUser?: boolean;
  prepTimeEstimate?: number;
  cancellationReason?: string;
}

type DeliveryAuctionEventType =
  | 'delivery_bid_created'
  | 'delivery_bid_updated'
  | 'auction_state_changed'
  | 'order_update'
  | 'status_change';

interface CanonicalAuctionEventEnvelope {
  eventId?: string;
  eventType?: DeliveryAuctionEventType | string;
  occurredAt?: string;
  orderId?: string;
  payload?: any;
  data?: any;
}

const EVENT_TTL_MS = 5 * 60 * 1000;

const TERMINAL_STATUS_CODES = new Set([
  'COMPLETED',
  'CANCELLED',
  'CANCELED',
  'REFUNDED',
]);

const normalizeBid = (payload: any): DeliveryBid => ({
  id: String(payload?.id || payload?.bidId || ''),
  bidAmount: Number(payload?.bidAmount ?? payload?.driverOffer ?? payload?.basePrice ?? 0),
  driverRating: Number(payload?.driverRating ?? payload?.driverRatingSnapshot ?? 0),
  estimatedTimeMinutes: payload?.estimatedTimeMinutes ?? payload?.estimated_time_minutes ?? null,
  driverNotes: payload?.driverNotes ?? payload?.driver_notes ?? null,
  basePrice: Number(payload?.basePrice ?? payload?.base_price ?? 0),
  status: String(payload?.status ?? 'ACTIVE'),
  expiresAt: String(payload?.expiresAt ?? payload?.expires_at ?? new Date().toISOString()),
  createdAt: String(payload?.createdAt ?? payload?.created_at ?? new Date().toISOString())
});

const buildEventKey = (envelope: CanonicalAuctionEventEnvelope): string => {
  if (envelope.eventId) return envelope.eventId;

  const payload = envelope.payload || envelope.data || envelope;
  const orderId = envelope.orderId || payload.orderId || payload.id || 'unknown-order';
  const occurredAt =
    envelope.occurredAt ||
    (envelope as any).updatedAt ||
    payload.occurredAt ||
    payload.updatedAt ||
    'unknown-time';
  const eventType = envelope.eventType || payload.eventType || 'unknown-type';

  return `${eventType}:${orderId}:${occurredAt}`;
};

const normalizeOrderStatus = (statusCode: string): string => {
  const normalized = statusCode.trim().toUpperCase().replace(/\s+/g, '_');
  const lookup: Record<string, string> = {
    COCINANDO: 'PREPARING',
    EN_CAMINO: 'DELIVERING',
    ENTREGADO: 'COMPLETED',
    ENVIADO_A_COCINA: 'PENDING'
  };

  return lookup[normalized] || normalized;
};

const isTerminalStatus = (statusCode: string | null | undefined): boolean => {
  const normalized = normalizeOrderStatus(String(statusCode || ''));
  return TERMINAL_STATUS_CODES.has(normalized);
};

const resolveStatusObject = (data: any): { code: string; label: string; description?: string | null } => {
  const incomingStatus = data?.newStatus;

  if (incomingStatus && typeof incomingStatus === 'object') {
    const resolvedCode = normalizeOrderStatus(String(incomingStatus.code || data?.statusCode || data?.status || 'UNKNOWN'));
    const resolvedLabel = String(incomingStatus.label || data?.label || data?.newStatusLabel || 'Estado actualizado');
    const resolvedDescription =
      typeof incomingStatus.description === 'string'
        ? incomingStatus.description
        : typeof data?.description === 'string'
          ? data.description
          : null;

    return {
      code: resolvedCode,
      label: resolvedLabel,
      description: resolvedDescription,
    };
  }

  const resolvedCode = normalizeOrderStatus(String(data?.statusCode || data?.status || incomingStatus || 'UNKNOWN'));
  const resolvedLabel = String(data?.label || data?.newStatusLabel || 'Estado actualizado');
  const resolvedDescription = typeof data?.description === 'string' ? data.description : null;

  return {
    code: resolvedCode,
    label: resolvedLabel,
    description: resolvedDescription,
  };
};

export function useOrderTracking(branchId: string, phone: string, customerId?: string) {
  // Use global store instead of local state
  const {
    activeOrders,
    addActiveOrder,
    updateActiveOrder,
    addBid,
    updateBid,
    addBidNotification,
    setAuctionState,
    clearCart
  } = useCartStore();
  const [isConnected, setIsConnected] = useState(false);
  const processedEventsRef = useRef<Map<string, number>>(new Map());
  const activeOrdersRef = useRef(activeOrders);
  const isClosingRef = useRef(false);

  useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);

  useEffect(() => {
    const normalizedPhone = String(phone || '').trim();
    const normalizedCustomerId = String(customerId || '').trim();

    if (!normalizedPhone && !normalizedCustomerId) {
        console.debug("🕵️ SSE: No phone or customerId provided, skipping connection.");
        return;
    }

    console.log(`📡 SSE: Attempting connection for phone: ${normalizedPhone || 'n/a'}, customerId: ${normalizedCustomerId || 'n/a'}`);
    // Use local proxy to hide backend URL and Branch ID
    const params = new URLSearchParams();
    if (normalizedPhone) {
      params.set('phone', normalizedPhone);
    }
    if (normalizedCustomerId) {
      params.set('customerId', normalizedCustomerId);
    }
    if (branchId) {
      params.set('branchId', branchId);
    }
    const url = `/api/track?${params.toString()}`;
    isClosingRef.current = false;
    
    // SSE connection
    const eventSource = new EventSource(url);

    // Generic handler for any event data
    const pruneProcessedEvents = () => {
      const now = Date.now();
      const entries = processedEventsRef.current.entries();

      for (const [key, timestamp] of entries) {
        if (now - timestamp > EVENT_TTL_MS) {
          processedEventsRef.current.delete(key);
        }
      }
    };

    const handleMessage = (event: MessageEvent) => {
      if (!event.data || event.data === 'ping' || event.data === 'heartbeat') return;

      try {
        const envelope: CanonicalAuctionEventEnvelope = JSON.parse(event.data);
        const data = envelope.payload || envelope.data || envelope;
        const eventType = String(envelope.eventType || data.eventType || event.type || 'message');
        const eventKey = buildEventKey(envelope);

        if (processedEventsRef.current.has(eventKey)) {
          return;
        }

        processedEventsRef.current.set(eventKey, Date.now());
        pruneProcessedEvents();

        const emitStatusChange = (orderId: string, status: { code: string; label: string; description?: string | null }) => {
          if (typeof window === 'undefined') {
            return;
          }

          window.dispatchEvent(new CustomEvent('fast-eat:order_status_changed', {
            detail: {
              orderId,
              statusCode: status.code,
              statusLabel: status.label,
              description: status.description || null,
              occurredAt: envelope.occurredAt || data.updatedAt || new Date().toISOString(),
              source: eventType,
            },
          }));
        };
        
        console.debug('📥 SSE Received Data:', data);

        const resolvedClientTotal =
          Number(data?.customerTotal ?? data?.customer_total ?? data?.total);
        const normalizedClientTotal = Number.isFinite(resolvedClientTotal)
          ? resolvedClientTotal
          : undefined;
        const resolvedSubtotal = Number(data?.subtotal ?? data?.baseSubtotal ?? data?.orderSubtotal);
        const normalizedSubtotal = Number.isFinite(resolvedSubtotal) ? resolvedSubtotal : undefined;
        const resolvedDeliveryFee = Number(data?.deliveryFee ?? data?.delivery_fee ?? data?.deliveryFinalPrice ?? data?.delivery_final_price);
        const normalizedDeliveryFee = Number.isFinite(resolvedDeliveryFee) ? resolvedDeliveryFee : undefined;
        const resolvedFeesTotal = Number(data?.feesTotal ?? data?.fees_total ?? data?.serviceAndPlatformFees);
        const normalizedFeesTotal = Number.isFinite(resolvedFeesTotal)
          ? resolvedFeesTotal
          : (normalizedClientTotal !== undefined && normalizedSubtotal !== undefined && normalizedDeliveryFee !== undefined
            ? Math.max(0, normalizedClientTotal - normalizedSubtotal - normalizedDeliveryFee)
            : undefined);
        const resolvedSecurityCode =
          typeof data?.securityCode === 'string'
            ? data.securityCode
            : typeof data?.security_code === 'string'
              ? data.security_code
              : undefined;

        if (eventType === 'delivery_bid_created') {
          const orderId = String(envelope.orderId || data.orderId || '');
          if (!orderId) return;

          const bid = normalizeBid(data.bid || data);
          addBid(orderId, bid);
          addBidNotification({
            id: bid.id,
            orderId,
            bid,
            receivedAt: envelope.occurredAt || data.createdAt || new Date().toISOString(),
            read: false
          });

          audioManager.playBidNotification();
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fast-eat:bid_notification_impression', {
              detail: {
                orderId,
                bidId: bid.id,
                bidAmount: bid.bidAmount,
                source: 'sse_event'
              }
            }));
          }
          return;
        }

        if (eventType === 'delivery_bid_updated') {
          const orderId = String(envelope.orderId || data.orderId || '');
          if (!orderId) return;

          const bid = normalizeBid(data.bid || data);
          updateBid(orderId, bid.id, bid);
          return;
        }

        if (eventType === 'auction_state_changed') {
          const currentActiveOrders = activeOrdersRef.current;
          const fallbackOrderId = Object.keys(currentActiveOrders).length === 1 ? Object.keys(currentActiveOrders)[0] : '';
          const orderId = String(envelope.orderId || data.orderId || data.order_id || fallbackOrderId || '');
          if (!orderId) return;

          const status = resolveStatusObject(data);
          setAuctionState(orderId, {
            isActive: status.code === 'AUCTION_ACTIVE',
            driverAssigned: status.code === 'DRIVER_ASSIGNED',
            deliveryId: data.deliveryId,
            deliveryFinalPrice: data.deliveryFinalPrice
          });

          emitStatusChange(orderId, status);

          const updatedAt = String(data.updatedAt || envelope.occurredAt || new Date().toISOString());
          const existingOrder = currentActiveOrders[orderId];

          if (existingOrder) {
            updateActiveOrder(orderId, {
              newStatus: {
                code: status.code,
                label: status.label,
                description: status.description || null,
              },
              updatedAt,
              deliveryId: data.deliveryId,
              deliveryFinalPrice: data.deliveryFinalPrice,
              total: normalizedClientTotal,
              subtotal: normalizedSubtotal,
              deliveryFee: normalizedDeliveryFee,
              feesTotal: normalizedFeesTotal,
              customerTotal: normalizedClientTotal,
              securityCode: resolvedSecurityCode,
            });
          } else {
            addActiveOrder({
              orderId,
              orderNumber: String(envelope.data?.orderNumber || data.orderNumber || 'PENDING'),
              previousStatus: { code: 'UNKNOWN', label: 'Desconocido', description: null },
              newStatus: { code: status.code, label: status.label, description: status.description || null },
              updatedAt,
              deliveryId: data.deliveryId,
              deliveryFinalPrice: data.deliveryFinalPrice,
              total: normalizedClientTotal,
              subtotal: normalizedSubtotal,
              deliveryFee: normalizedDeliveryFee,
              feesTotal: normalizedFeesTotal,
              customerTotal: normalizedClientTotal,
              securityCode: resolvedSecurityCode,
            });
          }

          if (isTerminalStatus(status.code)) {
            clearCart();
          }
        }

        if (data && (data.orderId || data.id)) {
            const id = data.orderId || data.id;
            const status = resolveStatusObject(data);
            emitStatusChange(id, status);
            const orderUpdate: OrderUpdate = {
                orderId: id,
                orderNumber: data.orderNumber || 'PENDING',
                previousStatus: data.previousStatus || { code: 'UNKNOWN', label: 'Desconocido', description: null },
              newStatus: status,
                updatedAt: data.updatedAt || new Date().toISOString(),
                items: data.items,
                total: normalizedClientTotal,
                subtotal: normalizedSubtotal,
                deliveryFee: normalizedDeliveryFee,
                feesTotal: normalizedFeesTotal,
                customerTotal: normalizedClientTotal,
                source: data.source,
                securityCode: resolvedSecurityCode,
                deliveryFinalPrice: data.deliveryFinalPrice,
                deliveryId: data.deliveryId,
                confirmedByDelivery: Boolean(data.confirmedByDelivery ?? data.confirmed_by_delivery),
                acceptedByUser: Boolean(data.acceptedByUser ?? data.accepted_by_user),
                prepTimeEstimate: data.prepTimeEstimate,
                cancellationReason: data.cancellationReason
            };
            addActiveOrder(orderUpdate);

            if (isTerminalStatus(status.code)) {
              clearCart();
            }
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
    eventSource.addEventListener('delivery_bid_created', handleMessage);
    eventSource.addEventListener('delivery_bid_updated', handleMessage);
    eventSource.addEventListener('auction_state_changed', handleMessage);

    eventSource.onerror = (e) => {
      if (isClosingRef.current || eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false);
        return;
      }

      console.warn("🟠 SSE: Connection interrupted", e);
      if (eventSource.readyState === EventSource.CLOSED) {
        setIsConnected(false);
      }
    };

    return () => {
      isClosingRef.current = true;
      console.log("🔌 SSE: Closing connection");
      eventSource.close();
      setIsConnected(false);
    };
  }, [branchId, phone, customerId, addActiveOrder, updateActiveOrder, addBid, updateBid, addBidNotification, setAuctionState, clearCart]);

  const orders = useMemo(
    () => (Object.values(activeOrders) as OrderUpdate[])
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()),
    [activeOrders]
  );

  return { orders, isConnected };
}
