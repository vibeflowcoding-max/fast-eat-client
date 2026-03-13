"use client";

import React from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { ArrowLeft, Clock3, Store, MapPin, Wallet, ClipboardList, Gavel, Loader2, Bike, RefreshCcw } from 'lucide-react';
import { Badge, Button, SectionHeader, Surface } from '@/../resources/components';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';
import ReviewCard from '@/features/reviews/components/ReviewCard';
import { useOrderReviewEligibility } from '@/features/reviews/hooks/useOrderReviewEligibility';
import { useSubmitRestaurantReview } from '@/features/reviews/hooks/useSubmitRestaurantReview';
import { useSubmitDeliveryReview } from '@/features/reviews/hooks/useSubmitDeliveryReview';
import { fetchOrderTracking } from '@/services/api';
import { DeliveryTrackingPayload } from '@/types';

type OrderBid = {
  id: string;
  status: string;
  driverId: string | null;
  driverOffer: number;
  basePrice: number;
  finalPrice: number;
  estimatedTimeMinutes: number | null;
  driverNotes: string | null;
  driverRatingSnapshot: number | null;
  createdAt: string;
  expiresAt: string | null;
  acceptedAt: string | null;
  rejectedAt: string | null;
};

type OrderDetail = {
  id: string;
  orderNumber: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  total: number;
  subtotal?: number;
  deliveryFee?: number;
  feesTotal?: number;
  customerTotal?: number;
  createdAt: string;
  items: unknown[];
  deliveryAddress: string | null;
  notes: string | null;
  cancellationReason?: string | null;
  estimatedTime: number | null;
  paymentMethod: string | null;
  branchId: string | null;
  restaurant: { id: string; name: string; logo_url: string | null } | null;
  acceptedDeliveryBid: { id: string; driverId: string | null } | null;
  bids: OrderBid[];
};

function normalizeItems(items: unknown[]): Array<{ name: string; quantity: number; price: number | null; notes: string | null; variantName: string | null; modifiers: string[] }> {
  return items
    .map((item) => {
      if (!item || typeof item !== 'object') {
        return null;
      }

      const parsed = item as Record<string, unknown>;
      const name =
        typeof parsed.name === 'string'
          ? parsed.name
          : typeof parsed.item_name === 'string'
            ? parsed.item_name
            : '';

      const quantity =
        typeof parsed.quantity === 'number'
          ? parsed.quantity
          : typeof parsed.qty === 'number'
            ? parsed.qty
            : 1;

      const price =
        typeof parsed.price === 'number'
          ? parsed.price
          : typeof parsed.unit_price === 'number'
            ? parsed.unit_price
            : null;

      const notes = typeof parsed.notes === 'string' ? parsed.notes : null;
      const variantName = typeof parsed.variant_name === 'string'
        ? parsed.variant_name
        : typeof parsed.variantName === 'string'
          ? parsed.variantName
          : null;

      const rawModifiers = Array.isArray(parsed.modifiers)
        ? parsed.modifiers
        : Array.isArray(parsed.selectedModifiers)
          ? parsed.selectedModifiers
          : [];
      const modifiers = rawModifiers
        .map((modifier) => {
          if (!modifier || typeof modifier !== 'object') {
            return null;
          }

          const record = modifier as Record<string, unknown>;
          const name = typeof record.name === 'string'
            ? record.name
            : typeof record.modifier_name === 'string'
              ? record.modifier_name
              : null;

          if (!name) {
            return null;
          }

          const quantity = typeof record.quantity === 'number' && record.quantity > 1 ? ` x${record.quantity}` : '';
          return `${name}${quantity}`;
        })
        .filter(Boolean) as string[];

      return { name, quantity, price, notes, variantName, modifiers };
    })
    .filter(Boolean) as Array<{ name: string; quantity: number; price: number | null; notes: string | null; variantName: string | null; modifiers: string[] }>;
}

export default function OrderDetailPage() {
  const t = useTranslations('orders.orderDetail');
  const params = useParams<{ orderId: string }>();
  const searchParams = useSearchParams();
  const router = useAppRouter();
  const { fromNumber, customerId } = useCartStore();
  const customerIdFromUrl = (searchParams.get('customerId') || '').trim();
  const effectiveCustomerId = customerIdFromUrl || customerId;
  const reviewsEnabled = process.env.NEXT_PUBLIC_REVIEWS_ENABLED !== 'false';
  const deliveryReviewsEnabled = process.env.NEXT_PUBLIC_DELIVERY_REVIEWS_ENABLED !== 'false';
  const reviewsRef = React.useRef<HTMLElement | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderDetail | null>(null);
  const [tracking, setTracking] = React.useState<DeliveryTrackingPayload | null>(null);
  const [trackingError, setTrackingError] = React.useState<string | null>(null);
  const [trackingLoading, setTrackingLoading] = React.useState(false);

  const {
    loading: loadingEligibility,
    error: eligibilityError,
    eligibility,
    refresh: refreshEligibility
  } = useOrderReviewEligibility({
    orderId: params?.orderId,
    customerId: effectiveCustomerId,
    enabled: reviewsEnabled && Boolean(params?.orderId) && Boolean(effectiveCustomerId)
  });

  const { submitting: submittingRestaurant, error: restaurantSubmitError, submit: submitRestaurantReview } =
    useSubmitRestaurantReview();
  const { submitting: submittingDelivery, error: deliverySubmitError, submit: submitDeliveryReview } =
    useSubmitDeliveryReview();

  React.useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);

      try {
        if (!params?.orderId) {
          throw new Error(t('invalidOrder'));
        }

        if (!effectiveCustomerId) {
          throw new Error(t('reviews.missingData'));
        }

        const response = await fetch(
          `/api/orders/${encodeURIComponent(params.orderId)}?customerId=${encodeURIComponent(effectiveCustomerId)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : t('loadError'));
        }

        setOrder(data.order ?? null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : t('loadError'));
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [effectiveCustomerId, params?.orderId, t]);

  React.useEffect(() => {
    async function fetchTracking() {
      if (!params?.orderId) {
        return;
      }

      setTrackingLoading(true);
      setTrackingError(null);

      try {
        const trackingPayload = await fetchOrderTracking(params.orderId);
        setTracking(trackingPayload);
      } catch (requestError) {
        setTrackingError(requestError instanceof Error ? requestError.message : 'Could not load tracking.');
      } finally {
        setTrackingLoading(false);
      }
    }

    fetchTracking();
  }, [params?.orderId]);

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    if (window.location.hash !== '#reviews') {
      return;
    }

    const timer = window.setTimeout(() => {
      reviewsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 160);

    return () => window.clearTimeout(timer);
  }, [loading, order?.id]);

  const normalizedItems = React.useMemo(() => normalizeItems(order?.items ?? []).map((item) => ({
    ...item,
    name: item.name || t('productFallback'),
  })), [order?.items, t]);

  const pricing = React.useMemo(() => {
    const subtotal = Number(order?.subtotal ?? 0);
    const customerTotal = Number(order?.customerTotal ?? order?.total ?? subtotal);
    const deliveryFee = Number(order?.deliveryFee ?? 0);
    const feesTotal = Number(order?.feesTotal ?? Math.max(0, customerTotal - subtotal - deliveryFee));

    return {
      subtotal,
      feesTotal,
      deliveryFee,
      customerTotal,
    };
  }, [order?.subtotal, order?.customerTotal, order?.total, order?.deliveryFee, order?.feesTotal]);

  const isCancelledOrder = React.useMemo(() => {
    return String(order?.statusCode || '').toUpperCase() === 'CANCELLED';
  }, [order?.statusCode]);

  const cancellationReason = React.useMemo(() => {
    if (!isCancelledOrder || typeof order?.cancellationReason !== 'string') {
      return null;
    }

    const trimmedReason = order.cancellationReason.trim();
    return trimmedReason.length > 0 ? trimmedReason : null;
  }, [isCancelledOrder, order?.cancellationReason]);

  const restaurantReason = eligibility?.reasons.restaurant?.[0] ?? null;
  const deliveryReason = eligibility?.reasons.delivery?.[0] ?? null;
  const trackingProgress = React.useMemo(() => {
    const code = String(tracking?.status?.code || '').toLowerCase();

    if (!code) {
      return 10;
    }

    if (code.includes('delivered')) {
      return 100;
    }
    if (code.includes('courier') || code.includes('driver') || code.includes('on_the_way') || code.includes('picked')) {
      return 75;
    }
    if (code.includes('preparing') || code.includes('accepted')) {
      return 45;
    }

    return 20;
  }, [tracking?.status?.code]);

  const handleSubmitRestaurantReview = React.useCallback(
    async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!order?.id || !fromNumber || !order.branchId) {
        throw new Error(t('reviews.missingData'));
      }

      await submitRestaurantReview({
        orderId: order.id,
        phone: fromNumber,
        branchId: order.branchId,
        rating,
        comment
      });

      await refreshEligibility();
    },
    [fromNumber, order?.branchId, order?.id, refreshEligibility, submitRestaurantReview, t]
  );

  const handleSubmitDeliveryReview = React.useCallback(
    async ({ rating, comment }: { rating: number; comment: string }) => {
      if (!order?.id || !fromNumber) {
        throw new Error(t('reviews.missingData'));
      }

      await submitDeliveryReview({
        orderId: order.id,
        phone: fromNumber,
        rating,
        comment,
        driverId: eligibility?.targets.driverId ?? order.acceptedDeliveryBid?.driverId ?? undefined,
        deliveryBidId: eligibility?.targets.acceptedBidId ?? order.acceptedDeliveryBid?.id ?? undefined
      });

      await refreshEligibility();
    },
    [eligibility?.targets.acceptedBidId, eligibility?.targets.driverId, fromNumber, order?.acceptedDeliveryBid?.driverId, order?.acceptedDeliveryBid?.id, order?.id, refreshEligibility, submitDeliveryReview, t]
  );

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push('/orders')}
            leadingIcon={<ArrowLeft className="w-4 h-4" />}
          >
            {t('back')}
          </Button>

          <div>
            <h1 className="text-2xl font-black tracking-tight">{t('title')}</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">{t('subtitle')}</p>
          </div>
        </header>

        {loading && (
          <Surface className="flex items-center gap-2 rounded-2xl text-sm text-slate-500 dark:text-slate-400" variant="muted">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </Surface>
        )}

        {error && <Surface className="rounded-2xl text-sm text-red-700 dark:text-red-200" variant="raised">{error}</Surface>}

        {!loading && !error && !order && (
          <Surface className="rounded-[1.8rem] text-sm text-slate-500 dark:text-slate-400" variant="base">
            {t('notFound')}
          </Surface>
        )}

        {!loading && !error && order && (
          <>
            <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
              <div className="flex items-center justify-between gap-2">
                <div className="space-y-1">
                  <SectionHeader eyebrow={t('title')} title={order.orderNumber ?? order.id.slice(0, 8)} />
                </div>
                <Badge variant="brand">
                  {order.statusLabel ?? order.statusCode ?? t('noStatus')}
                </Badge>
              </div>

              <div className="grid grid-cols-1 gap-3 text-sm text-slate-500 dark:text-slate-400 sm:grid-cols-2">
                <p className="inline-flex items-center gap-2"><Store className="h-4 w-4" />{order.restaurant?.name ?? t('restaurantFallback')}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{new Date(order.createdAt).toLocaleString('es-CR')}</p>
                <p className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" />{order.paymentMethod ?? t('paymentUnavailable')}</p>
                <p className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" />₡{Math.round(order.total).toLocaleString()}</p>
              </div>

              <p className="inline-flex items-start gap-2 text-sm text-slate-500 dark:text-slate-400">
                <MapPin className="mt-0.5 h-4 w-4" />
                {order.deliveryAddress ?? t('noAddress')}
              </p>

              {cancellationReason ? (
                <div className="rounded-[1.35rem] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900/40 dark:bg-red-950/30 dark:text-red-100">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-red-700 dark:text-red-200">{t('cancellationReason')}</p>
                  <p className="mt-1 font-medium">{cancellationReason}</p>
                </div>
              ) : null}

              {!cancellationReason && order.notes ? <p className="text-sm text-slate-500 dark:text-slate-400">{t('notes')}: {order.notes}</p> : null}
            </Surface>

            <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
              <div className="flex items-center justify-between gap-3">
                <div className="space-y-1">
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Tracking</p>
                  <h3 className="inline-flex items-center gap-2 text-lg font-black tracking-[-0.02em]">
                    <Bike className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                    Seguimiento de entrega
                  </h3>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={async () => {
                    if (!params?.orderId) {
                      return;
                    }
                    setTrackingLoading(true);
                    setTrackingError(null);
                    try {
                      setTracking(await fetchOrderTracking(params.orderId));
                    } catch (requestError) {
                      setTrackingError(requestError instanceof Error ? requestError.message : 'Could not load tracking.');
                    } finally {
                      setTrackingLoading(false);
                    }
                  }}
                  leadingIcon={trackingLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCcw className="h-4 w-4" />}
                >
                  Actualizar
                </Button>
              </div>

              {trackingError ? <Surface className="rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-200" variant="raised">{trackingError}</Surface> : null}

              {tracking ? (
                <>
                  <div className="space-y-2">
                    <div className="h-3 rounded-full bg-[#f4eee8] dark:bg-slate-800">
                      <div className="h-3 rounded-full bg-[linear-gradient(90deg,var(--color-brand)_0%,#fb923c_100%)] transition-all duration-500" style={{ width: `${trackingProgress}%` }} />
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                      <span>{tracking.status?.label || order.statusLabel || 'Pendiente'}</span>
                      <span>{tracking.eta.minutes != null ? `${tracking.eta.minutes} min` : 'ETA no disponible'}</span>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Surface className="rounded-[1.35rem] text-sm" variant="muted">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Courier</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{tracking.courier.assigned ? 'Asignado' : 'Sin asignar'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">{tracking.courier.freshness || 'Sin señal reciente'}</p>
                    </Surface>
                    <Surface className="rounded-[1.35rem] text-sm" variant="muted">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Subasta</p>
                      <p className="font-bold text-slate-900 dark:text-slate-100">{tracking.auction.state || 'Sin actividad'}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {tracking.auction.latestBid?.bidAmount != null
                          ? `Última oferta ₡${Math.round(tracking.auction.latestBid.bidAmount).toLocaleString()}`
                          : 'Sin oferta reciente'}
                      </p>
                    </Surface>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3 text-sm">
                    <Surface className="rounded-[1.2rem] text-sm" padding="sm" variant="muted">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Restaurante</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{tracking.restaurant.name || order.restaurant?.name || 'Restaurante'}</p>
                    </Surface>
                    <Surface className="rounded-[1.2rem] text-sm" padding="sm" variant="muted">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Destino</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{tracking.destination.coordinates.latitude != null ? 'Ubicación confirmada' : 'Sin coordenadas'}</p>
                    </Surface>
                    <Surface className="rounded-[1.2rem] text-sm" padding="sm" variant="muted">
                      <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">Modo</p>
                      <p className="font-semibold text-slate-900 dark:text-slate-100">{tracking.serviceMode}</p>
                    </Surface>
                  </div>
                </>
              ) : trackingLoading ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">Cargando tracking...</p>
              ) : (
                <p className="text-sm text-slate-500 dark:text-slate-400">Aún no hay datos de tracking para esta orden.</p>
              )}
            </Surface>

            <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
              <SectionHeader eyebrow={t('products')} title={t('products')} />
              {normalizedItems.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('productsEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {normalizedItems.map((item, index) => (
                    <Surface key={`${item.name}-${index}`} className="rounded-[1.35rem]" variant="muted">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">x{item.quantity}</p>
                      </div>
                      {item.variantName ? <p className="text-xs text-slate-500 dark:text-slate-400">Variante: {item.variantName}</p> : null}
                      {item.modifiers.length > 0 ? <p className="text-xs text-slate-500 dark:text-slate-400">Extras: {item.modifiers.join(', ')}</p> : null}
                      {item.price != null ? <p className="text-xs text-slate-500 dark:text-slate-400">₡{Math.round(item.price).toLocaleString()}</p> : null}
                      {item.notes ? <p className="text-xs text-slate-500 dark:text-slate-400">{item.notes}</p> : null}
                    </Surface>
                  ))}
                </div>
              )}

              <div className="space-y-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('subtotal')}</span>
                  <span>₡{Math.round(pricing.subtotal).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('fees')}</span>
                  <span>₡{Math.round(pricing.feesTotal).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                  <span>{t('deliveryPrice')}</span>
                  <span>₡{Math.round(pricing.deliveryFee).toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-black">
                  <span>{t('totalToPay')}</span>
                  <span>₡{Math.round(pricing.customerTotal).toLocaleString()}</span>
                </div>
              </div>
            </Surface>

            <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
              <div className="space-y-1">
                <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">{t('bidSection')}</p>
                <h3 className="inline-flex items-center gap-2 text-lg font-black tracking-[-0.02em]">
                  <Gavel className="h-4 w-4 text-orange-600 dark:text-orange-300" />
                  {t('bidSection')}
                </h3>
              </div>

              {order.bids.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">{t('bidSectionEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {order.bids.map((bid) => (
                    <Surface key={bid.id} className="space-y-2 rounded-[1.35rem]" variant="muted">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black">{t('bid')} {bid.id.slice(0, 8)}</p>
                        <Badge variant="neutral">{bid.status || 'unknown'}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-slate-500 dark:text-slate-400">
                        <span>{t('offer')}: ₡{Math.round(bid.driverOffer).toLocaleString()}</span>
                        <span>{t('base')}: ₡{Math.round(bid.basePrice).toLocaleString()}</span>
                        {bid.finalPrice > 0 ? <span>{t('final')}: ₡{Math.round(bid.finalPrice).toLocaleString()}</span> : null}
                        {bid.estimatedTimeMinutes != null ? <span>{t('eta')}: {bid.estimatedTimeMinutes} min</span> : null}
                        {bid.driverRatingSnapshot != null ? <span>{t('rating')}: {bid.driverRatingSnapshot.toFixed(1)}</span> : null}
                      </div>
                      {bid.driverNotes ? <p className="text-xs text-slate-500 dark:text-slate-400">{bid.driverNotes}</p> : null}
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">{new Date(bid.createdAt).toLocaleString('es-CR')}</p>
                    </Surface>
                  ))}
                </div>
              )}
            </Surface>

            {reviewsEnabled && (
              <section id="reviews" ref={reviewsRef}>
              <Surface className="space-y-4 rounded-[1.9rem]" variant="base">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.24em] text-orange-600 dark:text-orange-300">{t('reviews.title')}</p>
                  <h3 className="text-lg font-black tracking-[-0.02em]">{t('reviews.title')}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{t('reviews.subtitle')}</p>
                </div>

                {loadingEligibility && (
                  <p className="text-sm text-slate-500 dark:text-slate-400">{t('reviews.loading')}</p>
                )}

                {eligibilityError && (
                  <Surface className="rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-200" variant="raised">{eligibilityError}</Surface>
                )}

                {!loadingEligibility && !eligibilityError && eligibility && (
                  <div className="space-y-3">
                    <ReviewCard
                      title={t('reviews.restaurantTitle')}
                      subtitle={t('reviews.restaurantSubtitle')}
                      existingReview={eligibility.existing.restaurant}
                      canReview={eligibility.canReviewRestaurant}
                      disabledReason={restaurantReason}
                      submitting={submittingRestaurant}
                      dismissKey={`restaurant-${order.id}`}
                      onSubmit={handleSubmitRestaurantReview}
                    />

                    {deliveryReviewsEnabled && (
                      <ReviewCard
                        title={t('reviews.deliveryTitle')}
                        subtitle={t('reviews.deliverySubtitle')}
                        existingReview={eligibility.existing.delivery}
                        canReview={eligibility.canReviewDelivery}
                        disabledReason={deliveryReason}
                        submitting={submittingDelivery}
                        dismissKey={`delivery-${order.id}`}
                        onSubmit={handleSubmitDeliveryReview}
                      />
                    )}

                    {(restaurantSubmitError || deliverySubmitError) && (
                      <Surface className="rounded-xl px-3 py-2 text-xs text-red-700 dark:text-red-200" variant="raised">
                        {restaurantSubmitError || deliverySubmitError}
                      </Surface>
                    )}
                  </div>
                )}
              </Surface>
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
