"use client";

import React from 'react';
import { ArrowLeft, Bell, History, Truck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { AppShell, Button, SectionHeader, StickyHeaderBar, Surface } from '@/../resources/components';
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
          <Surface className="relative overflow-hidden rounded-[2rem]" variant="raised" padding="none">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.2),transparent_48%),radial-gradient(circle_at_bottom_left,rgba(251,191,36,0.18),transparent_40%)]" />
            <div className="relative space-y-5 px-6 py-6">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.16em] text-orange-700 dark:text-orange-300">
                    {t('groups.today.eyebrow')}
                  </p>
                  <h2 className="max-w-[18ch] text-2xl font-black tracking-[-0.03em] text-slate-900 dark:text-slate-100">
                    {t('emptyTitle')}
                  </h2>
                  <p className="max-w-[34ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t('emptyDescription')}
                  </p>
                </div>
                <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.25rem] bg-white/85 text-orange-600 shadow-[0_14px_34px_-22px_rgba(234,88,12,0.8)] ring-1 ring-orange-100 dark:bg-slate-950/60 dark:text-orange-300 dark:ring-orange-900/50">
                  <Bell className="h-6 w-6" />
                </div>
              </div>

              <Surface className="space-y-3 rounded-[1.5rem]" variant="base" padding="lg">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400 dark:text-slate-500">
                  {t('traySubtitle')}
                </p>
                <Button onClick={() => router.push('/')} size="md" variant="outline">
                  {t('emptyAction')}
                </Button>
              </Surface>
            </div>
          </Surface>
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