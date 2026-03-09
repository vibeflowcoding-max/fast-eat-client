"use client";

import React from 'react';
import { ArrowLeft, Bell, History, Truck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { AppShell, Button, EmptyState, SectionHeader, StickyHeaderBar } from '@/../resources/components';
import NotificationListItem from '@/features/notifications/components/NotificationListItem';
import { groupNotifications, mapBidNotificationsToItems, type NotificationGroupKey } from '@/features/notifications/notifications-model';
import { useTranslations } from 'next-intl';

const groupIconByKey: Record<NotificationGroupKey, React.ReactNode> = {
  today: <Bell className="h-4 w-4 text-orange-600" />,
  yesterday: <Truck className="h-4 w-4 text-orange-600" />,
  earlier: <History className="h-4 w-4 text-orange-600" />,
};

export default function NotificationsPage() {
  const router = useAppRouter();
  const t = useTranslations('notifications');
  const bidNotifications = useCartStore((state) => state.bidNotifications);
  const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
  const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);

  const groups = React.useMemo(() => {
    return groupNotifications(mapBidNotificationsToItems(bidNotifications));
  }, [bidNotifications]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.dispatchEvent(new CustomEvent('fast-eat:notifications_history_impression', {
      detail: { count: bidNotifications.length },
    }));
  }, [bidNotifications.length]);

  const handleNotificationClick = (orderId: string, bidId: string) => {
    markBidNotificationRead(bidId);
    setDeepLinkTarget({ orderId, bidId });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('fast-eat:notifications_history_click', {
        detail: { orderId, bidId },
      }));
    }

    router.push('/orders');
  };

  return (
    <AppShell
      chromeInset="bottom-nav"
      footer={<BottomNav />}
      header={(
        <StickyHeaderBar
          title={t('pageTitle')}
          subtitle={t('pageSubtitle')}
          leadingAction={(
            <Button
              aria-label={t('backToHome')}
              onClick={() => {
                if (typeof window !== 'undefined') {
                  window.dispatchEvent(new CustomEvent('fast-eat:notifications_history_back', {
                    detail: { source: 'notifications_page' },
                  }));
                }
                router.back();
              }}
              size="icon"
              variant="ghost"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
        />
      )}
    >
      <div className="space-y-6 pt-5">
        {groups.length === 0 ? (
          <EmptyState
            action={<Button onClick={() => router.push('/')} size="sm" variant="outline">{t('emptyAction')}</Button>}
            description={t('emptyDescription')}
            icon={<Bell className="h-6 w-6" />}
            title={t('emptyTitle')}
          />
        ) : (
          groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <SectionHeader
                action={groupIconByKey[group.key]}
                eyebrow={t(`groups.${group.key}.eyebrow`)}
                title={t(`groups.${group.key}.title`)}
              />
              <div className="space-y-3">
                {group.items.map((item) => (
                  <NotificationListItem
                    key={`${item.orderId}-${item.id}`}
                    item={{
                      ...item,
                      title: t('offerTitle'),
                      body: t('offerBody', {
                        amount: Math.round(bidNotifications.find((entry) => entry.id === item.bidId)?.bid.bidAmount || 0).toLocaleString(),
                        orderId: item.orderId.slice(0, 8),
                      }),
                      timestampLabel: item.groupKey === 'today'
                        ? item.timestampLabel === 'now'
                          ? t('time.now')
                          : item.timestampLabel
                        : item.groupKey === 'yesterday'
                          ? t('time.yesterday')
                          : item.timestampLabel,
                    }}
                    onClick={() => handleNotificationClick(item.orderId, item.bidId)}
                  />
                ))}
              </div>
            </section>
          ))
        )}
      </div>
    </AppShell>
  );
}