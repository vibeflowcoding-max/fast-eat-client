"use client";

import React, { useMemo } from 'react';
import { useCartStore } from '@/store';

interface OrderNotificationsTrayProps {
  onOpenTracking: () => void;
}

const OrderNotificationsTray: React.FC<OrderNotificationsTrayProps> = ({ onOpenTracking }) => {
  const bidNotifications = useCartStore((state) => state.bidNotifications);
  const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
  const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);

  const sortedNotifications = useMemo(
    () => [...bidNotifications].sort((a, b) => new Date(b.receivedAt).getTime() - new Date(a.receivedAt).getTime()).slice(0, 20),
    [bidNotifications]
  );

  if (!sortedNotifications.length) {
    return (
      <div className="w-80 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-2xl">
        <p className="text-xs font-bold text-gray-500">No hay nuevas ofertas todavía.</p>
      </div>
    );
  }

  return (
    <div className="w-80 max-h-96 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-2 shadow-2xl">
      {sortedNotifications.map((notification) => (
        <button
          key={`${notification.orderId}-${notification.id}`}
          type="button"
          onClick={() => {
            markBidNotificationRead(notification.id);
            setDeepLinkTarget({ orderId: notification.orderId, bidId: notification.id });
            onOpenTracking();
          }}
          className={`w-full text-left p-3 rounded-xl border mb-2 last:mb-0 transition-all ${notification.read ? 'bg-gray-50 border-gray-200' : 'bg-red-50 border-red-200'}`}
        >
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-500">
            Orden #{notification.orderId.slice(0, 8)}
          </p>
          <p className="text-sm font-black text-gray-900">Nueva oferta: ₡{notification.bid.bidAmount.toLocaleString()}</p>
          <p className="text-[11px] text-gray-600">Rating {notification.bid.driverRating.toFixed(1)} · {new Date(notification.receivedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
        </button>
      ))}
    </div>
  );
};

export default OrderNotificationsTray;
