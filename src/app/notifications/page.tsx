"use client";

import React from 'react';
import { ArrowLeft, Bell, History, Truck } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { AppShell, Button, Surface } from '@/../resources/components';
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
        <div className="sticky top-0 z-10 bg-[#f8f6f2]/95 px-4 pb-3 pt-4 backdrop-blur dark:bg-[#221610]/95">
          <div className="relative flex min-h-[4.5rem] items-start justify-center">
            <Button
              aria-label={t('backToHome')}
              className="absolute left-0 top-0 text-slate-700 dark:text-slate-200"
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
            <div className="px-12 pt-0.5 text-center">
              <h1 className="text-[1.45rem] font-black tracking-[-0.03em] text-slate-900 dark:text-slate-100">{t('pageTitle')}</h1>
              <p className="mt-0.5 text-sm text-slate-500 dark:text-slate-400">{t('pageSubtitle')}</p>
            </div>
          </div>
          <div className="border-b border-slate-200/90 dark:border-slate-800/90" />
        </div>
      )}
    >
      <div className="space-y-7 pt-4">
        {groups.length === 0 ? (
          <Surface className="rounded-[2rem] border border-orange-100/90 bg-[#fffaf6] px-5 py-6 shadow-none" variant="base" padding="none">
            <div className="space-y-5">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-2">
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">
                    {t('groups.today.eyebrow')}
                  </p>
                  <h2 className="max-w-[18ch] text-[1.8rem] font-black tracking-[-0.04em] text-slate-900 dark:text-slate-100">
                    {t('emptyTitle')}
                  </h2>
                  <p className="max-w-[34ch] text-sm leading-6 text-slate-600 dark:text-slate-300">
                    {t('emptyDescription')}
                  </p>
                </div>
                <div className="flex size-14 shrink-0 items-center justify-center rounded-[1.15rem] bg-orange-600 text-white shadow-[0_14px_34px_-22px_rgba(234,88,12,0.8)]">
                  <Bell className="h-6 w-6" />
                </div>
              </div>

              <Surface className="space-y-3 rounded-[1.5rem] border border-orange-100/80 bg-white/90" variant="base" padding="lg">
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
            <section key={group.key} className="space-y-3.5">
              <div className="flex items-start justify-between gap-4 px-1">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-orange-600 dark:text-orange-300">
                    {t(`groups.${group.key}.eyebrow`)}
                  </p>
                  <h2 className="mt-1 text-[1.95rem] font-black leading-none tracking-[-0.05em] text-slate-900 dark:text-slate-100">
                    {t(`groups.${group.key}.title`)}
                  </h2>
                </div>
                <div className="pt-1">{groupIconByKey[group.key]}</div>
              </div>
              <div className="space-y-2.5">
                {group.items.map((item) => (
                  <NotificationListItem
                    key={`${item.orderId}-${item.id}`}
                    compact
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
                    timestampClassName="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500"
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