"use client";

import React from 'react';
import { ArrowRight, PackageCheck, Save, ShoppingCart, Trash2, Users } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import type { OrderUpdate } from '@/hooks/useOrderTracking';
import type { PersistedCartRecord } from '@/types';
import { archiveSavedCart, fetchSavedCartById, fetchSavedCarts, saveCurrentCart } from '@/services/api';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';

type ApiActiveOrder = {
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
  restaurant: { id: string; name: string; logo_url: string | null } | null;
};

function formatCurrency(value: number): string {
  return `₡${Math.round(value).toLocaleString('es-CR')}`;
}

function mapApiOrderToStoreOrder(order: ApiActiveOrder, fallbackLabel: string): OrderUpdate {
  return {
    orderId: order.id,
    orderNumber: order.orderNumber || order.id,
    previousStatus: {
      code: order.statusCode || 'UNKNOWN',
      label: order.statusLabel || fallbackLabel,
    },
    newStatus: {
      code: order.statusCode || 'UNKNOWN',
      label: order.statusLabel || fallbackLabel,
    },
    updatedAt: order.updatedAt || order.createdAt,
    items: Array.isArray(order.items)
      ? order.items.map((item: any) => ({
          id: String(item.menu_item_id || item.id || ''),
          name: String(item.name || 'Item'),
          description: '',
          price: Number(item.price || 0),
          category: '',
          image: '',
          quantity: Number(item.quantity || 1),
          notes: '',
        }))
      : [],
    total: Number(order.customerTotal ?? order.total ?? 0),
    subtotal: Number(order.subtotal ?? order.total ?? 0),
    deliveryFee: Number(order.deliveryFee ?? 0),
    feesTotal: Number(order.feesTotal ?? 0),
    customerTotal: Number(order.customerTotal ?? order.total ?? 0),
    securityCode: order.securityCode,
  };
}

export default function CartsPageContent() {
  const t = useTranslations('carts');
  const router = useAppRouter();
  const loadErrorMessage = t('loadError');
  const orderInProgressLabel = t('orderInProgress');
  const savedCartsLoadError = t('savedCartsLoadError');
  const {
    items,
    branchId,
    restaurantInfo,
    activeOrders,
    checkoutDraft,
    customerName,
    fromNumber,
    customerId,
    groupSessionId,
    groupParticipants,
    savedCarts,
    savedCartsHydrated,
    savedCartsError,
    replaceActiveOrders,
    restorePersistedCart,
    setCustomerId,
    setSavedCarts,
    upsertSavedCart,
    removeSavedCart,
    setSavedCartsHydrated,
    setSavedCartsError,
  } = useCartStore();

  const [isSavingCurrentCart, setIsSavingCurrentCart] = React.useState(false);
  const [activeCartActionId, setActiveCartActionId] = React.useState<string | null>(null);
  const [loadingActiveOrders, setLoadingActiveOrders] = React.useState(true);
  const [activeOrdersError, setActiveOrdersError] = React.useState<string | null>(null);
  const [activeOrdersFromApi, setActiveOrdersFromApi] = React.useState<ApiActiveOrder[]>([]);

  const effectiveCart = React.useMemo(() => {
    if (groupSessionId && groupParticipants.length > 0) {
      return groupParticipants.flatMap((participant) => participant.items);
    }

    return items;
  }, [groupParticipants, groupSessionId, items]);

  const cartSubtotal = React.useMemo(
    () => effectiveCart.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [effectiveCart],
  );
  const totalItemCount = React.useMemo(
    () => effectiveCart.reduce((sum, item) => sum + item.quantity, 0),
    [effectiveCart],
  );
  const activeOrdersFromStore = React.useMemo(() => Object.values(activeOrders), [activeOrders]);

  const refreshSavedCarts = React.useCallback(async () => {
    setSavedCartsError(null);

    try {
      const carts = await fetchSavedCarts();
      setSavedCarts(carts);
    } catch (error) {
      setSavedCartsError(error instanceof Error ? error.message : savedCartsLoadError);
    } finally {
      setSavedCartsHydrated(true);
    }
  }, [savedCartsLoadError, setSavedCarts, setSavedCartsError, setSavedCartsHydrated]);

  React.useEffect(() => {
    if (!savedCartsHydrated) {
      void refreshSavedCarts();
    }
  }, [refreshSavedCarts, savedCartsHydrated]);

  React.useEffect(() => {
    let active = true;

    const loadActiveOrders = async () => {
      setLoadingActiveOrders(true);
      setActiveOrdersError(null);

      try {
        if (!fromNumber && !customerId) {
          if (active) {
            setActiveOrdersFromApi([]);
            replaceActiveOrders([]);
          }
          return;
        }

        const query = customerId
          ? `customerId=${encodeURIComponent(customerId)}`
          : `phone=${encodeURIComponent(fromNumber)}`;
        const response = await fetch(`/api/orders/history?${query}`);
        const payload = await response.json();

        if (!response.ok) {
          throw new Error(typeof payload?.error === 'string' ? payload.error : loadErrorMessage);
        }

        if (!active) {
          return;
        }

        const nextCustomerId = typeof payload?.customerId === 'string' ? payload.customerId.trim() : '';
        if (nextCustomerId && nextCustomerId !== customerId) {
          setCustomerId(nextCustomerId);
        }

        const nextActiveOrders = Array.isArray(payload?.activeOrders) ? payload.activeOrders : [];
        setActiveOrdersFromApi(nextActiveOrders);
        replaceActiveOrders(nextActiveOrders.map((order: ApiActiveOrder) => mapApiOrderToStoreOrder(order, orderInProgressLabel)));
      } catch (error) {
        if (!active) {
          return;
        }

        setActiveOrdersError(error instanceof Error ? error.message : loadErrorMessage);
      } finally {
        if (active) {
          setLoadingActiveOrders(false);
        }
      }
    };

    void loadActiveOrders();

    return () => {
      active = false;
    };
  }, [customerId, fromNumber, loadErrorMessage, orderInProgressLabel, replaceActiveOrders, setCustomerId]);

  const visibleTrackedOrders = React.useMemo(() => {
    if (activeOrdersFromApi.length === 0) {
      return activeOrdersFromStore.map((order) => ({
        id: order.orderId,
        orderNumber: order.orderNumber || order.orderId,
        statusLabel: order.newStatus?.label || order.newStatus?.code || t('orderInProgress'),
        total: Number(order.customerTotal ?? order.total ?? 0),
        restaurantName: restaurantInfo?.name || t('restaurantFallback'),
        customerId: customerId || '',
      }));
    }

    return activeOrdersFromApi.map((order) => ({
      id: order.id,
      orderNumber: order.orderNumber || order.id,
      statusLabel: order.statusLabel || order.statusCode || t('orderInProgress'),
      total: Number(order.customerTotal ?? order.total ?? 0),
      restaurantName: order.restaurant?.name || restaurantInfo?.name || t('restaurantFallback'),
      customerId: order.customerId || customerId || '',
    }));
  }, [activeOrdersFromApi, activeOrdersFromStore, customerId, restaurantInfo?.name, t]);

  const hasCurrentCart = effectiveCart.length > 0;
  const hasTrackedOrders = visibleTrackedOrders.length > 0;
  const hasSavedCarts = savedCarts.length > 0;

  const buildOrderUrl = React.useCallback((orderId: string, orderCustomerId?: string) => {
    const normalizedCustomerId = String(orderCustomerId || customerId || '').trim();
    const query = normalizedCustomerId ? `?customerId=${encodeURIComponent(normalizedCustomerId)}` : '';
    return `/orders/${encodeURIComponent(orderId)}${query}`;
  }, [customerId]);

  const handleSaveCurrentCart = React.useCallback(async () => {
    if (!hasCurrentCart || !branchId) {
      return;
    }

    setIsSavingCurrentCart(true);
    setSavedCartsError(null);

    try {
      const saved = await saveCurrentCart({
        branchId,
        cartItems: effectiveCart,
        checkoutDraft: {
          ...checkoutDraft,
          customerName: checkoutDraft.customerName || customerName || '',
          customerPhone: checkoutDraft.customerPhone || fromNumber || '',
        },
        restaurantSnapshot: restaurantInfo,
        metadata: {
          savedFrom: 'carts-page',
          isGroupCart: Boolean(groupSessionId && groupParticipants.length > 0),
        },
      });

      upsertSavedCart(saved);
    } catch (error) {
      setSavedCartsError(error instanceof Error ? error.message : t('saveError'));
    } finally {
      setIsSavingCurrentCart(false);
    }
  }, [branchId, checkoutDraft, customerName, effectiveCart, fromNumber, groupParticipants.length, groupSessionId, hasCurrentCart, restaurantInfo, setSavedCartsError, t, upsertSavedCart]);

  const handleOpenSavedCart = React.useCallback(async (cartId: string) => {
    setActiveCartActionId(cartId);
    setSavedCartsError(null);

    try {
      const savedCart = await fetchSavedCartById(cartId);
      restorePersistedCart({
        branchId: savedCart.branchId,
        items: savedCart.cartItems,
        checkoutDraft: savedCart.checkoutDraft,
        restaurantInfo: savedCart.restaurantSnapshot,
        customerName: savedCart.checkoutDraft.customerName || customerName,
        customerPhone: savedCart.checkoutDraft.customerPhone || fromNumber,
      });
      router.push(`/${encodeURIComponent(savedCart.restaurantSlug)}`);
    } catch (error) {
      setSavedCartsError(error instanceof Error ? error.message : t('restoreError'));
    } finally {
      setActiveCartActionId(null);
    }
  }, [customerName, fromNumber, restorePersistedCart, router, t]);

  const handleArchiveSavedCart = React.useCallback(async (cartId: string) => {
    setActiveCartActionId(cartId);
    setSavedCartsError(null);

    try {
      await archiveSavedCart(cartId);
      removeSavedCart(cartId);
    } catch (error) {
      setSavedCartsError(error instanceof Error ? error.message : t('archiveError'));
    } finally {
      setActiveCartActionId(null);
    }
  }, [removeSavedCart, setSavedCartsError, t]);

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black">{t('title')}</h1>
          <p className="ui-text-muted text-sm">{t('subtitle')}</p>
        </header>

        {hasCurrentCart ? (
          <section className="ui-panel rounded-[1.9rem] p-5 space-y-4">
            <div className="space-y-1">
              <p className="ui-section-title">{t('currentCartEyebrow')}</p>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-black tracking-[-0.02em]">
                    {groupSessionId && groupParticipants.length > 0 ? t('groupCartTitle') : t('currentCartTitle')}
                  </h2>
                  <p className="ui-text-muted text-sm">
                    {restaurantInfo?.name || t('restaurantFallback')}
                  </p>
                </div>
                <div className="ui-chip-brand inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-black">
                  {groupSessionId && groupParticipants.length > 0 ? <Users className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  {groupSessionId && groupParticipants.length > 0
                    ? t('participantCount', { count: groupParticipants.length })
                    : t('itemCount', { count: totalItemCount })}
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="ui-list-card rounded-[1.4rem] p-4">
                <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('itemCountLabel')}</p>
                <p className="mt-2 text-2xl font-black">{totalItemCount}</p>
              </div>
              <div className="ui-list-card rounded-[1.4rem] p-4">
                <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('subtotalLabel')}</p>
                <p className="mt-2 text-2xl font-black">{formatCurrency(cartSubtotal)}</p>
              </div>
              <div className="ui-list-card rounded-[1.4rem] p-4">
                <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('checkoutStateLabel')}</p>
                <p className="mt-2 text-sm font-bold">{groupSessionId && groupParticipants.length > 0 ? t('groupCheckoutState') : t('soloCheckoutState')}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => router.push('/checkout')}
                className="ui-btn-primary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black"
              >
                {t('continueCheckout')}
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={handleSaveCurrentCart}
                disabled={isSavingCurrentCart}
                className="ui-btn-secondary inline-flex min-h-[46px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black"
              >
                <Save className="h-4 w-4" />
                {isSavingCurrentCart ? t('savingCurrentCart') : t('saveCurrentCart')}
              </button>
              <button
                type="button"
                onClick={() => router.push(branchId ? `/?branch_id=${encodeURIComponent(branchId)}` : '/')}
                className="ui-btn-secondary inline-flex min-h-[46px] items-center justify-center rounded-full px-5 py-3 text-sm font-black"
              >
                {t('continueBrowsing')}
              </button>
            </div>
          </section>
        ) : null}

        <section className="ui-panel rounded-[1.9rem] p-5 space-y-4">
          <div className="space-y-1">
            <p className="ui-section-title">{t('savedCartsEyebrow')}</p>
            <h2 className="text-lg font-black tracking-[-0.02em]">{t('savedCartsTitle')}</h2>
            <p className="ui-text-muted text-sm">{t('savedCartsSubtitle')}</p>
          </div>

          {savedCartsError ? (
            <div className="ui-state-danger rounded-[1.4rem] p-4 text-sm">{savedCartsError}</div>
          ) : null}

          {!savedCartsHydrated ? (
            <div className="ui-panel-soft rounded-[1.4rem] p-4 text-sm">{t('loadingSavedCarts')}</div>
          ) : hasSavedCarts ? (
            <div className="space-y-3">
              {savedCarts.map((cart) => (
                <article key={cart.id} className="ui-list-card rounded-[1.4rem] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{cart.restaurantName}</p>
                      <p className="ui-text-muted text-sm">{cart.branchName || cart.restaurantSlug}</p>
                    </div>
                    <span className="ui-status-pill">{cart.storageSource === 'local' ? t('localStorageBadge') : t('databaseStorageBadge')}</span>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <div>
                      <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('itemCountLabel')}</p>
                      <p className="font-black">{cart.itemCount}</p>
                    </div>
                    <div>
                      <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('subtotalLabel')}</p>
                      <p className="font-black">{formatCurrency(cart.subtotal)}</p>
                    </div>
                    <div>
                      <p className="ui-text-muted text-[11px] font-black uppercase tracking-[0.18em]">{t('savedAtLabel')}</p>
                      <p className="font-black">{new Date(cart.updatedAt).toLocaleDateString('es-CR')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => handleOpenSavedCart(cart.id)}
                      disabled={activeCartActionId === cart.id}
                      className="ui-btn-primary inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                    >
                      <ShoppingCart className="h-4 w-4" />
                      {t('openSavedCart')}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleArchiveSavedCart(cart.id)}
                      disabled={activeCartActionId === cart.id}
                      className="ui-btn-secondary inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                    >
                      <Trash2 className="h-4 w-4" />
                      {t('archiveSavedCart')}
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="ui-text-muted text-sm">{t('savedCartsEmpty')}</p>
          )}
        </section>

        <section className="ui-panel rounded-[1.9rem] p-5 space-y-4">
          <div className="space-y-1">
            <p className="ui-section-title">{t('activeOrdersEyebrow')}</p>
            <h2 className="text-lg font-black tracking-[-0.02em]">{t('activeOrdersTitle')}</h2>
            <p className="ui-text-muted text-sm">{t('activeOrdersSubtitle')}</p>
          </div>

          {loadingActiveOrders ? (
            <div className="ui-panel-soft rounded-[1.4rem] p-4 text-sm">{t('loadingActiveOrders')}</div>
          ) : activeOrdersError ? (
            <div className="ui-state-danger rounded-[1.4rem] p-4 text-sm">{activeOrdersError}</div>
          ) : hasTrackedOrders ? (
            <div className="space-y-3">
              {visibleTrackedOrders.map((order) => (
                <article key={order.id} className="ui-list-card rounded-[1.4rem] p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{order.orderNumber}</p>
                      <p className="ui-text-muted text-sm">{order.restaurantName}</p>
                    </div>
                    <span className="ui-status-pill">{order.statusLabel}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="ui-text-muted">{t('orderTotal')}</span>
                    <span className="font-black">{formatCurrency(order.total)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => router.push(buildOrderUrl(order.id, order.customerId))}
                    className="ui-btn-secondary inline-flex min-h-[42px] items-center justify-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                  >
                    <PackageCheck className="h-4 w-4" />
                    {t('openOrder')}
                  </button>
                </article>
              ))}
            </div>
          ) : hasCurrentCart ? (
            <p className="ui-text-muted text-sm">{t('noLiveOrders')}</p>
          ) : (
            <div className="space-y-3 rounded-[1.5rem] border border-dashed border-[var(--color-border)] px-5 py-8 text-center">
              <p className="text-lg font-black">{t('emptyTitle')}</p>
              <p className="ui-text-muted text-sm">{t('emptySubtitle')}</p>
              <div>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="ui-btn-primary inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-black"
                >
                  {t('startOrdering')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>

      <BottomNav />
    </main>
  );
}