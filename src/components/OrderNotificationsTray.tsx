"use client";

import React, { useMemo } from 'react';
import { Bell, Sparkles, X } from 'lucide-react';
import { Button, EmptyState, Surface } from '@/../resources/components';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { mapBidNotificationsToItems } from '@/features/notifications/notifications-model';
import NotificationListItem from '@/features/notifications/components/NotificationListItem';
import { useTranslations } from 'next-intl';

interface OrderNotificationsTrayProps {
  onOpenTracking: () => void;
  onClose?: () => void;
}

const OrderNotificationsTray: React.FC<OrderNotificationsTrayProps> = ({ onOpenTracking, onClose }) => {
  const router = useAppRouter();
  const t = useTranslations('notifications');
  const bidNotifications = useCartStore((state) => state.bidNotifications);
  const activeOrders = useCartStore((state) => state.activeOrders);
  const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
  const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);

  const orderNumbersById = useMemo(
    () => Object.fromEntries(
      Object.entries(activeOrders).map(([orderId, order]) => [orderId, order.orderNumber])
    ),
    [activeOrders]
  );

  const sortedNotifications = useMemo(
    () => mapBidNotificationsToItems(bidNotifications, { orderNumbersById }),
    [bidNotifications, orderNumbersById]
  );

  const trayNotifications = useMemo(
    () => sortedNotifications.map((notification) => ({
      ...notification,
      title: t('offerTitle'),
      body: t('offerBody', {
        amount: Math.round(bidNotifications.find((entry) => entry.id === notification.bidId)?.bid.bidAmount || 0).toLocaleString(),
        orderId: notification.orderNumber,
      }),
      timestampLabel: notification.timestampLabel === 'now' ? t('time.now') : notification.timestampLabel,
    })),
    [bidNotifications, sortedNotifications, t]
  );

  const unreadCount = bidNotifications.filter((notification) => !notification.read).length;

  const handleOpenHistory = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:notifications_history_opened', {
        detail: { source: 'notifications_tray' },
      }));
    }

    onClose?.();
    router.push('/notifications');
  };

  if (!sortedNotifications.length) {
    return (
      <Surface className="max-h-[calc(100vh-2rem)] w-full rounded-[2rem] border border-orange-100/90 bg-[#fffaf6] p-[1.15rem] shadow-[0_28px_80px_-38px_rgba(98,60,29,0.5)] dark:bg-[#2d1e16]" variant="base">
        <div className="flex items-start justify-between gap-3 border-b border-orange-100/80 pb-4">
          <div className="min-w-0 pr-3">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[1.05rem] font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100">{t('trayTitle')}</h3>
            </div>
            <p className="mt-1 text-sm leading-5 text-slate-500 dark:text-slate-300">{t('traySubtitle')}</p>
          </div>
          <Button aria-label={t('closeTray')} className="mt-0.5 size-9 rounded-full border border-transparent text-slate-500 hover:border-orange-100 hover:bg-orange-50 dark:text-slate-300 dark:hover:bg-orange-500/10" onClick={onClose} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="pt-5">
          <EmptyState
            action={<Button onClick={handleOpenHistory} size="sm" variant="outline">{t('seeAll')}</Button>}
            description={t('emptyDescription')}
            icon={<Bell className="h-6 w-6" />}
            title={t('emptyTitle')}
          />
        </div>
      </Surface>
    );
  }

  return (
    <Surface className="flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-[2rem] border border-orange-100/90 bg-[#fffaf6] p-[1.15rem] shadow-[0_28px_80px_-38px_rgba(98,60,29,0.5)] dark:bg-[#2d1e16]" variant="base">
      <div className="flex items-start justify-between gap-3 border-b border-orange-100/80 pb-4">
        <div className="min-w-0 pr-3">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-[1.05rem] font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100">{t('trayTitle')}</h3>
            {unreadCount > 0 ? <span className="rounded-full bg-orange-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-200">{t('newBadge')}</span> : null}
          </div>
        </div>
        <Button aria-label={t('closeTray')} className="mt-0.5 size-9 rounded-full border border-transparent text-slate-500 hover:border-orange-100 hover:bg-orange-50 dark:text-slate-300 dark:hover:bg-orange-500/10" onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 flex-col">
        <div className="max-h-[min(24rem,calc(100vh-15rem))] space-y-3 overflow-y-auto pr-1">
          {trayNotifications.map((notification) => (
            <NotificationListItem
              key={`${notification.orderId}-${notification.id}`}
              item={notification}
              variant="tray"
              onClick={() => {
                markBidNotificationRead(notification.id);
                setDeepLinkTarget({ orderId: notification.orderId, bidId: notification.id });
                onClose?.();
                onOpenTracking();
              }}
              timestampClassName="text-[11px] font-black uppercase tracking-[0.08em] text-orange-500 dark:text-orange-300"
            />
          ))}
        </div>
      </div>

      <div className="mt-5 border-t border-orange-100/80 pt-4">
        <Button
          className="h-14 rounded-[1.4rem] border-0 bg-orange-600 text-[0.98rem] font-black shadow-none hover:bg-orange-700"
          fullWidth
          onClick={handleOpenHistory}
          size="md"
        >
          <Sparkles className="h-4 w-4" />
          {t('seeAll')}
        </Button>
      </div>
    </Surface>
  );
};

export default OrderNotificationsTray;
