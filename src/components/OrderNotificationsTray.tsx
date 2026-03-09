"use client";

import React, { useMemo } from 'react';
import { Bell, Sparkles, X } from 'lucide-react';
import { Button, EmptyState, SectionHeader, Surface } from '@/../resources/components';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import NotificationListItem from '@/features/notifications/components/NotificationListItem';
import { mapBidNotificationsToItems } from '@/features/notifications/notifications-model';
import { useTranslations } from 'next-intl';

interface OrderNotificationsTrayProps {
  onOpenTracking: () => void;
  onClose?: () => void;
}

const OrderNotificationsTray: React.FC<OrderNotificationsTrayProps> = ({ onOpenTracking, onClose }) => {
  const router = useAppRouter();
  const t = useTranslations('notifications');
  const bidNotifications = useCartStore((state) => state.bidNotifications);
  const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
  const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);

  const sortedNotifications = useMemo(
    () => mapBidNotificationsToItems(bidNotifications).slice(0, 3),
    [bidNotifications]
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
      <Surface className="w-[min(92vw,24rem)] rounded-[2rem] border border-orange-100/80 p-4 shadow-[0_24px_60px_-28px_rgba(98,60,29,0.5)]" variant="base">
        <div className="flex items-center justify-between gap-3 border-b border-orange-100/70 pb-3">
          <SectionHeader title={t('trayTitle')} description={t('traySubtitle')} />
          <Button aria-label={t('closeTray')} className="size-9 rounded-full" onClick={onClose} size="icon" variant="ghost">
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="pt-4">
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
    <Surface className="w-[min(92vw,24rem)] rounded-[2rem] border border-orange-100/80 p-4 shadow-[0_24px_60px_-28px_rgba(98,60,29,0.5)]" variant="base">
      <div className="flex items-center justify-between gap-3 border-b border-orange-100/70 pb-3">
        <SectionHeader
          title={t('trayTitle')}
          description={t('traySubtitle')}
          action={unreadCount > 0 ? <span className="rounded-full bg-orange-100 px-2 py-1 text-[10px] font-black uppercase tracking-[0.08em] text-orange-700 dark:bg-orange-500/10 dark:text-orange-200">{t('newBadge')}</span> : undefined}
        />
        <Button aria-label={t('closeTray')} className="size-9 rounded-full" onClick={onClose} size="icon" variant="ghost">
          <X className="h-4 w-4" />
        </Button>
      </div>

      <div className="mt-4 space-y-3">
        {sortedNotifications.map((notification) => (
          <NotificationListItem
            key={`${notification.orderId}-${notification.id}`}
            compact
            item={{
              ...notification,
              title: t('offerTitle'),
              body: t('offerBody', {
                amount: Math.round(bidNotifications.find((entry) => entry.id === notification.bidId)?.bid.bidAmount || 0).toLocaleString(),
                orderId: notification.orderId.slice(0, 8),
              }),
              timestampLabel: notification.timestampLabel === 'now' ? t('time.now') : notification.timestampLabel,
            }}
            onClick={() => {
              markBidNotificationRead(notification.id);
              setDeepLinkTarget({ orderId: notification.orderId, bidId: notification.id });
              onClose?.();
              onOpenTracking();
            }}
          />
        ))}
      </div>

      <div className="mt-4 rounded-[1.4rem] bg-orange-50/80 p-2 dark:bg-orange-500/10">
        <Button
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
