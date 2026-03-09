"use client";

import React from 'react';
import { ArrowRight, PackageCheck, Save, ShoppingCart, Trash2, Users } from 'lucide-react';
import { Badge, Button, EmptyState, SectionHeader, Surface } from '@/../resources/components';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import type { OrderUpdate } from '@/hooks/useOrderTracking';
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
  }, [customerName, fromNumber, restorePersistedCart, router, setSavedCartsError, t]);

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
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
        </header>

        {hasCurrentCart ? (
          <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
            <SectionHeader
              eyebrow={t('currentCartEyebrow')}
              title={groupSessionId && groupParticipants.length > 0 ? t('groupCartTitle') : t('currentCartTitle')}
              description={restaurantInfo?.name || t('restaurantFallback')}
              action={(
                <Badge
                  className="px-3 py-2 text-xs font-black"
                  leading={groupSessionId && groupParticipants.length > 0 ? <Users className="h-3.5 w-3.5" /> : <ShoppingCart className="h-3.5 w-3.5" />}
                  variant="brand"
                >
                  {groupSessionId && groupParticipants.length > 0
                    ? t('participantCount', { count: groupParticipants.length })
                    : t('itemCount', { count: totalItemCount })}
                </Badge>
              )}
            />

            <div className="grid gap-3 sm:grid-cols-3">
              <Surface className="rounded-[1.4rem]" variant="muted">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('itemCountLabel')}</p>
                <p className="mt-2 text-2xl font-black">{totalItemCount}</p>
              </Surface>
              <Surface className="rounded-[1.4rem]" variant="muted">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('subtotalLabel')}</p>
                <p className="mt-2 text-2xl font-black">{formatCurrency(cartSubtotal)}</p>
              </Surface>
              <Surface className="rounded-[1.4rem]" variant="muted">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('checkoutStateLabel')}</p>
                <p className="mt-2 text-sm font-bold">{groupSessionId && groupParticipants.length > 0 ? t('groupCheckoutState') : t('soloCheckoutState')}</p>
              </Surface>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={() => router.push('/checkout')}
                leadingIcon={<ArrowRight className="h-4 w-4" />}
                size="md"
              >
                {t('continueCheckout')}
              </Button>
              <Button
                onClick={handleSaveCurrentCart}
                disabled={isSavingCurrentCart}
                leadingIcon={<Save className="h-4 w-4" />}
                size="md"
                variant="secondary"
              >
                {isSavingCurrentCart ? t('savingCurrentCart') : t('saveCurrentCart')}
              </Button>
              <Button
                onClick={() => router.push(branchId ? `/?branch_id=${encodeURIComponent(branchId)}` : '/')}
                size="md"
                variant="outline"
              >
                {t('continueBrowsing')}
              </Button>
            </div>
          </Surface>
        ) : null}

        <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
          <SectionHeader
            eyebrow={t('savedCartsEyebrow')}
            title={t('savedCartsTitle')}
            description={t('savedCartsSubtitle')}
          />

          {savedCartsError ? (
            <Surface className="rounded-[1.4rem] text-sm text-red-700 dark:text-red-200" variant="raised">
              {savedCartsError}
            </Surface>
          ) : null}

          {!savedCartsHydrated ? (
            <Surface className="rounded-[1.4rem] text-sm text-slate-600 dark:text-slate-300" variant="muted">
              {t('loadingSavedCarts')}
            </Surface>
          ) : hasSavedCarts ? (
            <div className="space-y-3">
              {savedCarts.map((cart) => (
                <Surface key={cart.id} className="space-y-3 rounded-[1.4rem]" variant="muted">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{cart.restaurantName}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{cart.branchName || cart.restaurantSlug}</p>
                    </div>
                    <Badge variant={cart.storageSource === 'local' ? 'warning' : 'success'}>
                      {cart.storageSource === 'local' ? t('localStorageBadge') : t('databaseStorageBadge')}
                    </Badge>
                  </div>
                  <div className="grid gap-3 text-sm sm:grid-cols-3">
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('itemCountLabel')}</p>
                      <p className="font-black">{cart.itemCount}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('subtotalLabel')}</p>
                      <p className="font-black">{formatCurrency(cart.subtotal)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">{t('savedAtLabel')}</p>
                      <p className="font-black">{new Date(cart.updatedAt).toLocaleDateString('es-CR')}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => handleOpenSavedCart(cart.id)}
                      disabled={activeCartActionId === cart.id}
                      leadingIcon={<ShoppingCart className="h-4 w-4" />}
                      size="sm"
                    >
                      {t('openSavedCart')}
                    </Button>
                    <Button
                      onClick={() => handleArchiveSavedCart(cart.id)}
                      disabled={activeCartActionId === cart.id}
                      leadingIcon={<Trash2 className="h-4 w-4" />}
                      size="sm"
                      variant="outline"
                    >
                      {t('archiveSavedCart')}
                    </Button>
                  </div>
                </Surface>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('savedCartsEmpty')}</p>
          )}
        </Surface>

        <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
          <SectionHeader
            eyebrow={t('activeOrdersEyebrow')}
            title={t('activeOrdersTitle')}
            description={t('activeOrdersSubtitle')}
          />

          {loadingActiveOrders ? (
            <Surface className="rounded-[1.4rem] text-sm text-slate-600 dark:text-slate-300" variant="muted">
              {t('loadingActiveOrders')}
            </Surface>
          ) : activeOrdersError ? (
            <Surface className="rounded-[1.4rem] text-sm text-red-700 dark:text-red-200" variant="raised">
              {activeOrdersError}
            </Surface>
          ) : hasTrackedOrders ? (
            <div className="space-y-3">
              {visibleTrackedOrders.map((order) => (
                <Surface key={order.id} className="space-y-3 rounded-[1.4rem]" variant="muted">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black">{order.orderNumber}</p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{order.restaurantName}</p>
                    </div>
                    <Badge variant="neutral">{order.statusLabel}</Badge>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-500 dark:text-slate-400">{t('orderTotal')}</span>
                    <span className="font-black">{formatCurrency(order.total)}</span>
                  </div>
                  <Button
                    onClick={() => router.push(buildOrderUrl(order.id, order.customerId))}
                    leadingIcon={<PackageCheck className="h-4 w-4" />}
                    size="sm"
                    variant="outline"
                  >
                    {t('openOrder')}
                  </Button>
                </Surface>
              ))}
            </div>
          ) : hasCurrentCart ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('noLiveOrders')}</p>
          ) : (
            <EmptyState
              title={t('emptyTitle')}
              description={t('emptySubtitle')}
              action={(
                <Button onClick={() => router.push('/')} leadingIcon={<ArrowRight className="h-4 w-4" />}>
                  {t('startOrdering')}
                </Button>
              )}
            />
          )}
        </Surface>
      </div>

      <BottomNav />
    </main>
  );
}