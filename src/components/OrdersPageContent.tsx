"use client";

import React from 'react';
import { Clock3, PackageCheck, Loader2, Gavel, ArrowRight } from 'lucide-react';
import { Badge, Button, EmptyState, SectionHeader, Surface } from '@/../resources/components';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';
import { useOrderTracking, type OrderUpdate } from '@/hooks/useOrderTracking';

type ApiOrder = {
  id: string;
  customerId: string;
  orderNumber: string | null;
  branchId: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  feesTotal?: number;
  customerTotal?: number;
  securityCode: string | null;
  createdAt: string;
  updatedAt?: string;
  items: unknown[];
  bidCount: number;
  bestBid: number | null;
  restaurant: { id: string; name: string; logo_url: string | null } | null;
};

const RECENT_TERMINAL_WINDOW_MS = 15 * 60 * 1000;

function isRecentTimestamp(value: string | null | undefined): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return false;
  return (Date.now() - timestamp) <= RECENT_TERMINAL_WINDOW_MS;
}

export default function OrdersPageContent() {
  const t = useTranslations('orders');
  const router = useAppRouter();
  const { activeOrders, bidsByOrderId, fromNumber, customerId, branchId, setCustomerId, replaceActiveOrders, clearCart } = useCartStore();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFromApi, setActiveFromApi] = React.useState<ApiOrder[]>([]);
  const [pastOrders, setPastOrders] = React.useState<ApiOrder[]>([]);
  const [resolvedCustomerId, setResolvedCustomerId] = React.useState('');
  const activeOrdersRef = React.useRef(activeOrders);

  React.useEffect(() => {
    activeOrdersRef.current = activeOrders;
  }, [activeOrders]);
  const trackingBranchId = React.useMemo(() => {
    const activeBranch = activeFromApi.find((order) => Boolean(order.branchId))?.branchId;
    return activeBranch || branchId;
  }, [activeFromApi, branchId]);

  const trackingCustomerId = React.useMemo(() => {
    return customerId || resolvedCustomerId;
  }, [customerId, resolvedCustomerId]);

  useOrderTracking(trackingBranchId, trackingCustomerId ? '' : fromNumber, trackingCustomerId);

  const refreshOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!fromNumber && !trackingCustomerId) {
        setActiveFromApi([]);
        setPastOrders([]);
        setCustomerId('');
        replaceActiveOrders([]);
        return;
      }

      const fetchHistory = async (url: string) => {
        const response = await fetch(url);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : t('loadError'));
        }

        return data;
      };

      const historyByCustomerUrl = trackingCustomerId
        ? `/api/orders/history?customerId=${encodeURIComponent(trackingCustomerId)}`
        : '';
      const historyByPhoneUrl = fromNumber
        ? `/api/orders/history?phone=${encodeURIComponent(fromNumber)}`
        : '';

      let data = historyByCustomerUrl
        ? await fetchHistory(historyByCustomerUrl)
        : await fetchHistory(historyByPhoneUrl);

      const primaryActive = Array.isArray(data.activeOrders) ? data.activeOrders : [];
      const primaryPast = Array.isArray(data.pastOrders) ? data.pastOrders : [];
      const shouldRetryByPhone = Boolean(historyByCustomerUrl && historyByPhoneUrl) && (primaryActive.length + primaryPast.length === 0);

      if (shouldRetryByPhone) {
        const fallbackData = await fetchHistory(historyByPhoneUrl);
        const fallbackActive = Array.isArray(fallbackData.activeOrders) ? fallbackData.activeOrders : [];
        const fallbackPast = Array.isArray(fallbackData.pastOrders) ? fallbackData.pastOrders : [];

        if (fallbackActive.length + fallbackPast.length > 0) {
          data = fallbackData;
        }
      }

      const apiCustomerId = typeof data.customerId === 'string' ? data.customerId : '';
      const shouldAdoptApiCustomerId = Boolean(apiCustomerId) && apiCustomerId !== trackingCustomerId;

      if (shouldAdoptApiCustomerId) {
        setCustomerId(apiCustomerId);
        setResolvedCustomerId(apiCustomerId);
      }
      const nextActive = Array.isArray(data.activeOrders) ? data.activeOrders : [];
      const nextPast = Array.isArray(data.pastOrders) ? data.pastOrders : [];

      setActiveFromApi(nextActive);
      setPastOrders(nextPast);

      const contextOrders: OrderUpdate[] = nextActive.map((order: ApiOrder) => ({
        orderId: order.id,
        orderNumber: order.orderNumber || order.id,
        previousStatus: {
          code: order.statusCode || 'UNKNOWN',
          label: order.statusLabel || t('inProgress')
        },
        newStatus: {
          code: order.statusCode || 'UNKNOWN',
          label: order.statusLabel || t('inProgress')
        },
        updatedAt: order.createdAt,
        items: Array.isArray(order.items)
          ? order.items.map((item: any) => ({
              id: String(item.menu_item_id || item.id || ''),
              name: String(item.name || 'Item'),
              description: '',
              price: Number(item.price || 0),
              category: '',
              image: '',
              quantity: Number(item.quantity || 1),
              notes: ''
            }))
          : [],
        total: order.total,
        subtotal: Number(order.subtotal ?? order.total ?? 0),
        deliveryFee: Number(order.deliveryFee ?? 0),
        feesTotal: Number(order.feesTotal ?? 0),
        customerTotal: Number(order.customerTotal ?? order.total ?? 0),
        securityCode: order.securityCode,
      }));

      replaceActiveOrders(contextOrders);

      const hadTrackedActiveOrders = Object.keys(activeOrdersRef.current || {}).length > 0;
      const hasRecentTerminalOrder = nextPast.some((order: ApiOrder) =>
        isRecentTimestamp(order.updatedAt || order.createdAt)
      );

      if ((hadTrackedActiveOrders || hasRecentTerminalOrder) && contextOrders.length === 0) {
        clearCart();
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [fromNumber, replaceActiveOrders, setCustomerId, clearCart, t, trackingCustomerId]);

  React.useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const activeFromStore = React.useMemo(() => Object.values(activeOrders), [activeOrders]);
  const filteredStoreOrders = React.useMemo(() => {
    if (activeFromApi.length === 0) return activeFromStore;

    const ids = new Set(activeFromApi.map((order) => order.id));
    const numbers = new Set(activeFromApi.map((order) => order.orderNumber).filter(Boolean));

    return activeFromStore.filter((order) =>
      ids.has(order.orderId) || (order.orderNumber && numbers.has(order.orderNumber))
    );
  }, [activeFromApi, activeFromStore]);

  const mergedActiveCount = filteredStoreOrders.length + activeFromApi.length;

  const buildOrderUrl = React.useCallback((orderId: string, orderCustomerId?: string | null, hash?: string) => {
    const customerIdForUrl = (orderCustomerId || trackingCustomerId || '').trim();
    const query = customerIdForUrl ? `?customerId=${encodeURIComponent(customerIdForUrl)}` : '';
    const suffix = hash || '';
    return `/orders/${encodeURIComponent(orderId)}${query}${suffix}`;
  }, [trackingCustomerId]);

  const preventCardNavigation = React.useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
  }, []);

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </header>

        {loading && (
          <Surface className="flex items-center gap-2 rounded-2xl text-sm text-slate-500 dark:text-slate-400" variant="muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </Surface>
        )}

        {error && (
          <Surface className="rounded-2xl text-sm text-red-700 dark:text-red-200" variant="raised">{error}</Surface>
        )}

        {!loading && !error && (
          <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
            <SectionHeader eyebrow={t('activeOrders')} title={t('activeOrders')} />

            {mergedActiveCount === 0 ? (
              <EmptyState
                title={t('activeOrders')}
                description={t('activeEmpty')}
                action={(
                  <Button leadingIcon={<ArrowRight className="w-4 h-4" />} onClick={() => router.push('/')}>
                    {t('startOrdering')}
                  </Button>
                )}
              />
            ) : (
              <div className="space-y-3">
                {filteredStoreOrders.map((order) => (
                  <Surface
                    key={order.orderId}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(buildOrderUrl(order.orderId))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(buildOrderUrl(order.orderId));
                      }
                    }}
                    className="cursor-pointer space-y-2 rounded-[1.4rem] shadow-[0_14px_34px_-28px_rgba(236,91,19,0.5)]"
                    variant="raised"
                  >
                    <p className="text-xs font-black">{order.orderNumber || order.orderId}</p>
                    <p className="text-sm">{t('status')}: {order.newStatus?.label ?? order.newStatus?.code ?? t('inProgress')}</p>
                    <p className="text-xs">Total: ₡{Math.round(order.total ?? 0).toLocaleString()}</p>
                    <p className="text-xs">{t('active')} {t('bids')}: {(bidsByOrderId[order.orderId] ?? []).length}</p>
                  </Surface>
                ))}

                {activeFromApi.map((order) => (
                  <Surface
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(buildOrderUrl(order.id, order.customerId))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(buildOrderUrl(order.id, order.customerId));
                      }
                    }}
                    className="cursor-pointer space-y-3 rounded-[1.4rem]"
                    variant="muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <Badge variant="brand">{order.statusLabel ?? order.statusCode ?? t('active')}</Badge>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? t('restaurant')}</p>
                    <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                      <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{new Date(order.createdAt).toLocaleString('es-CR')}</span>
                      <span className="inline-flex items-center gap-1"><Gavel className="w-3 h-3" />{order.bidCount} {t('bids')}</span>
                      {order.bestBid ? <span>{t('bestBid')}: ₡{Math.round(order.bestBid).toLocaleString()}</span> : null}
                    </div>
                  </Surface>
                ))}
              </div>
            )}
          </Surface>
        )}

        {!loading && !error && (
          <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
            <SectionHeader eyebrow={t('pastOrders')} title={t('pastOrders')} />
            {pastOrders.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">{t('pastOrdersEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {pastOrders.map((order) => (
                  <Surface
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(buildOrderUrl(order.id, order.customerId))}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(buildOrderUrl(order.id, order.customerId));
                      }
                    }}
                    className="cursor-pointer space-y-3 rounded-[1.4rem]"
                    variant="muted"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(order.createdAt).toLocaleDateString('es-CR')}</span>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? t('restaurant')}</p>
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                        <PackageCheck className="w-3 h-3" />
                        {order.statusLabel ?? order.statusCode ?? t('completed')}
                      </span>
                      <span className="text-sm font-bold">₡{Math.round(order.total).toLocaleString()}</span>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <Button
                        onClick={(event) => {
                          preventCardNavigation(event);
                          router.push(buildOrderUrl(order.id, order.customerId, '#reviews'));
                        }}
                        size="sm"
                        variant="outline"
                      >
                        {t('rateOrder')}
                      </Button>
                      <Button
                        onClick={(event) => {
                          preventCardNavigation(event);
                          router.push('/');
                        }}
                        size="sm"
                      >
                        {t('repeatOrder')}
                      </Button>
                    </div>
                  </Surface>
                ))}
              </div>
            )}
          </Surface>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
