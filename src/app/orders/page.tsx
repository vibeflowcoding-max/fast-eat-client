"use client";

import React from 'react';
import { Clock3, PackageCheck, Loader2, Gavel, ArrowRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';
import { useOrderTracking, type OrderUpdate } from '@/hooks/useOrderTracking';

type ApiOrder = {
  id: string;
  customerId: string;
  orderNumber: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  total: number;
  createdAt: string;
  items: unknown[];
  bidCount: number;
  bestBid: number | null;
  restaurant: { id: string; name: string; logo_url: string | null } | null;
};

export default function OrdersPage() {
  const t = useTranslations('orders');
  const router = useAppRouter();
  const { activeOrders, bidsByOrderId, fromNumber, customerId, isAuthenticated, branchId, setCustomerId, replaceActiveOrders } = useCartStore();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFromApi, setActiveFromApi] = React.useState<ApiOrder[]>([]);
  const [pastOrders, setPastOrders] = React.useState<ApiOrder[]>([]);
  const [resolvedCustomerId, setResolvedCustomerId] = React.useState('');

  useOrderTracking(branchId, isAuthenticated ? '' : fromNumber, customerId || resolvedCustomerId);

  const refreshOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!fromNumber && !customerId) {
        setActiveFromApi([]);
        setPastOrders([]);
        setCustomerId('');
        replaceActiveOrders([]);
        return;
      }

      const historyUrl = customerId
        ? `/api/orders/history?customerId=${encodeURIComponent(customerId)}`
        : `/api/orders/history?phone=${encodeURIComponent(fromNumber)}`;

      const response = await fetch(historyUrl);
      const data = await response.json();

      if (!response.ok) {
      throw new Error(typeof data.error === 'string' ? data.error : t('loadError'));
      }

      const apiCustomerId = typeof data.customerId === 'string' ? data.customerId : '';
      const shouldAdoptApiCustomerId = Boolean(apiCustomerId) && !customerId && !isAuthenticated;

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
      }));

      replaceActiveOrders(contextOrders);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [customerId, fromNumber, isAuthenticated, replaceActiveOrders, setCustomerId, t]);

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
    const customerIdForUrl = (orderCustomerId || resolvedCustomerId || '').trim();
    const query = customerIdForUrl ? `?customerId=${encodeURIComponent(customerIdForUrl)}` : '';
    const suffix = hash || '';
    return `/orders/${encodeURIComponent(orderId)}${query}${suffix}`;
  }, [resolvedCustomerId]);

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black">{t('title')}</h1>
          <p className="ui-text-muted text-sm">{t('subtitle')}</p>
        </header>

        {loading && (
          <div className="ui-panel ui-text-muted flex items-center gap-2 rounded-2xl p-5 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {error && (
          <div className="ui-state-danger rounded-2xl p-5 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <section className="ui-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-black">{t('activeOrders')}</h2>

            {mergedActiveCount === 0 ? (
              <div className="space-y-3">
                <p className="ui-text-muted text-sm">{t('activeEmpty')}</p>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="ui-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                >
                  {t('startOrdering')}
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredStoreOrders.map((order) => (
                  <article
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
                    className="ui-chip-brand rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <p className="text-xs font-black">{order.orderNumber || order.orderId}</p>
                    <p className="text-sm">{t('status')}: {order.newStatus?.label ?? order.newStatus?.code ?? t('inProgress')}</p>
                    <p className="text-xs">Total: ₡{Math.round(order.total ?? 0).toLocaleString()}</p>
                    <p className="text-xs">{t('active')} {t('bids')}: {(bidsByOrderId[order.orderId] ?? []).length}</p>
                  </article>
                ))}

                {activeFromApi.map((order) => (
                  <article
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
                    className="ui-panel-soft rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <span className="ui-chip-brand rounded-full px-2 py-1 text-[10px] font-bold">{order.statusLabel ?? order.statusCode ?? t('active')}</span>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? t('restaurant')}</p>
                    <div className="ui-text-muted flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{new Date(order.createdAt).toLocaleString('es-CR')}</span>
                      <span className="inline-flex items-center gap-1"><Gavel className="w-3 h-3" />{order.bidCount} {t('bids')}</span>
                      {order.bestBid ? <span>{t('bestBid')}: ₡{Math.round(order.bestBid).toLocaleString()}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && !error && (
          <section className="ui-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-black">{t('pastOrders')}</h2>
            {pastOrders.length === 0 ? (
              <p className="ui-text-muted text-sm">{t('pastOrdersEmpty')}</p>
            ) : (
              <div className="space-y-2">
                {pastOrders.map((order) => (
                  <article
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
                    className="ui-panel-soft rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <span className="ui-text-muted text-[11px]">{new Date(order.createdAt).toLocaleDateString('es-CR')}</span>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? t('restaurant')}</p>
                    <div className="flex items-center justify-between">
                      <span className="ui-text-muted inline-flex items-center gap-1 text-xs">
                        <PackageCheck className="w-3 h-3" />
                        {order.statusLabel ?? order.statusCode ?? t('completed')}
                      </span>
                      <span className="text-sm font-bold">₡{Math.round(order.total).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push(buildOrderUrl(order.id, order.customerId, '#reviews'))}
                      className="text-xs font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
                    >
                      {t('rateOrder')}
                    </button>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="text-xs font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
                    >
                      {t('repeatOrder')}
                    </button>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
