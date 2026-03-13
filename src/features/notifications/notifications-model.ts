import type { BidNotification } from '@/types';

type OrderDisplayLookup = Record<string, string | null | undefined>;

export type NotificationGroupKey = 'today' | 'yesterday' | 'earlier';

export type AppNotificationItem = {
  id: string;
  orderId: string;
  orderNumber: string;
  bidId: string;
  title: string;
  body: string;
  timestampLabel: string;
  receivedAt: string;
  read: boolean;
  accentClassName: string;
  iconSymbol: 'local_shipping' | 'sell' | 'notifications' | 'history';
  groupKey: NotificationGroupKey;
};

export type NotificationGroup = {
  key: NotificationGroupKey;
  items: AppNotificationItem[];
};

function getGroupKey(receivedAt: string, now: Date): NotificationGroupKey {
  const receivedDate = new Date(receivedAt);
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfReceivedDay = new Date(receivedDate.getFullYear(), receivedDate.getMonth(), receivedDate.getDate());
  const diffDays = Math.round((startOfToday.getTime() - startOfReceivedDay.getTime()) / 86_400_000);

  if (diffDays <= 0) {
    return 'today';
  }

  if (diffDays === 1) {
    return 'yesterday';
  }

  return 'earlier';
}

function getTimestampLabel(receivedAt: string, groupKey: NotificationGroupKey, now: Date, locale: string) {
  const receivedDate = new Date(receivedAt);
  const diffMs = Math.max(now.getTime() - receivedDate.getTime(), 0);

  if (groupKey === 'today') {
    const diffMinutes = Math.floor(diffMs / 60_000);

    if (diffMinutes < 1) {
      return 'now';
    }

    if (diffMinutes < 60) {
      return `${diffMinutes}m ago`;
    }

    return receivedDate.toLocaleTimeString(locale, { hour: 'numeric', minute: '2-digit' });
  }

  if (groupKey === 'yesterday') {
    return 'Yesterday';
  }

  const diffDays = Math.max(1, Math.floor(diffMs / 86_400_000));
  return `${diffDays}d ago`;
}

export function mapBidNotificationsToItems(
  notifications: BidNotification[],
  options?: { locale?: string; now?: Date; orderNumbersById?: OrderDisplayLookup },
): AppNotificationItem[] {
  const locale = options?.locale ?? 'en-US';
  const now = options?.now ?? new Date();
  const orderNumbersById = options?.orderNumbersById ?? {};

  return [...notifications]
    .sort((left, right) => new Date(right.receivedAt).getTime() - new Date(left.receivedAt).getTime())
    .map((notification) => {
      const groupKey = getGroupKey(notification.receivedAt, now);
      const amount = Math.round(notification.bid.bidAmount || 0).toLocaleString(locale);
      const rating = typeof notification.bid.driverRating === 'number'
        ? notification.bid.driverRating.toFixed(1)
        : null;
      const eta = notification.bid.estimatedTimeMinutes;
      const resolvedOrderNumber = orderNumbersById[notification.orderId]?.trim() || notification.orderId.slice(0, 8);
      const bodySegments = [
        `A courier offer of ₡${amount} is ready for order ${resolvedOrderNumber}.`,
        rating ? `Rating ${rating}.` : null,
        typeof eta === 'number' ? `${eta} min estimated.` : null,
      ].filter(Boolean);

      return {
        id: notification.id,
        orderId: notification.orderId,
        orderNumber: resolvedOrderNumber,
        bidId: notification.id,
        title: 'Delivery offer received',
        body: bodySegments.join(' '),
        timestampLabel: getTimestampLabel(notification.receivedAt, groupKey, now, locale),
        receivedAt: notification.receivedAt,
        read: notification.read,
        accentClassName: notification.read
          ? 'bg-white/75 text-slate-600 dark:bg-slate-900/40 dark:text-slate-300'
          : 'bg-orange-50/95 text-orange-700 ring-1 ring-orange-200 dark:bg-orange-500/10 dark:text-orange-200 dark:ring-orange-400/20',
        iconSymbol: groupKey === 'earlier' ? 'history' : 'local_shipping',
        groupKey,
      };
    });
}

export function groupNotifications(items: AppNotificationItem[]): NotificationGroup[] {
  const grouped: Record<NotificationGroupKey, AppNotificationItem[]> = {
    today: [],
    yesterday: [],
    earlier: [],
  };

  items.forEach((item) => {
    grouped[item.groupKey].push(item);
  });

  return (['today', 'yesterday', 'earlier'] as NotificationGroupKey[])
    .map((key) => ({ key, items: grouped[key] }))
    .filter((group) => group.items.length > 0);
}