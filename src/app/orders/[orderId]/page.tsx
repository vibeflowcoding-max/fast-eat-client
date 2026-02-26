"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock3, Store, MapPin, Wallet, ClipboardList, Gavel, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';
import { useTranslations } from 'next-intl';
import ReviewCard from '@/features/reviews/components/ReviewCard';
import { useOrderReviewEligibility } from '@/features/reviews/hooks/useOrderReviewEligibility';
import { useSubmitRestaurantReview } from '@/features/reviews/hooks/useSubmitRestaurantReview';
import { useSubmitDeliveryReview } from '@/features/reviews/hooks/useSubmitDeliveryReview';

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
  createdAt: string;
  items: unknown[];
  deliveryAddress: string | null;
  notes: string | null;
  estimatedTime: number | null;
  paymentMethod: string | null;
  branchId: string | null;
  restaurant: { id: string; name: string; logo_url: string | null } | null;
  acceptedDeliveryBid: { id: string; driverId: string | null } | null;
  bids: OrderBid[];
};

function normalizeItems(items: unknown[]): Array<{ name: string; quantity: number; price: number | null; notes: string | null }> {
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

      return { name, quantity, price, notes };
    })
    .filter(Boolean) as Array<{ name: string; quantity: number; price: number | null; notes: string | null }>;
}

export default function OrderDetailPage() {
  const t = useTranslations('orders.orderDetail');
  const params = useParams<{ orderId: string }>();
  const router = useAppRouter();
  const { fromNumber } = useCartStore();
  const reviewsEnabled = process.env.NEXT_PUBLIC_REVIEWS_ENABLED !== 'false';
  const deliveryReviewsEnabled = process.env.NEXT_PUBLIC_DELIVERY_REVIEWS_ENABLED !== 'false';
  const reviewsRef = React.useRef<HTMLElement | null>(null);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderDetail | null>(null);

  const {
    loading: loadingEligibility,
    error: eligibilityError,
    eligibility,
    refresh: refreshEligibility
  } = useOrderReviewEligibility({
    orderId: params?.orderId,
    phone: fromNumber,
    enabled: reviewsEnabled && Boolean(params?.orderId) && Boolean(fromNumber)
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

        if (!fromNumber) {
          throw new Error(t('missingPhone'));
        }

        const response = await fetch(
          `/api/orders/${encodeURIComponent(params.orderId)}?phone=${encodeURIComponent(fromNumber)}`
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
  }, [fromNumber, params?.orderId, t]);

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

  const restaurantReason = eligibility?.reasons.restaurant?.[0] ?? null;
  const deliveryReason = eligibility?.reasons.delivery?.[0] ?? null;

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
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="ui-btn-secondary inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            {t('back')}
          </button>

          <div>
            <h1 className="text-2xl font-black">{t('title')}</h1>
            <p className="ui-text-muted text-sm">{t('subtitle')}</p>
          </div>
        </header>

        {loading && (
          <div className="ui-panel ui-text-muted flex items-center gap-2 rounded-2xl p-5 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            {t('loading')}
          </div>
        )}

        {error && <div className="ui-state-danger rounded-2xl p-5 text-sm">{error}</div>}

        {!loading && !error && !order && (
          <div className="ui-panel ui-text-muted rounded-2xl p-5 text-sm">
            {t('notFound')}
          </div>
        )}

        {!loading && !error && order && (
          <>
            <section className="ui-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black">{order.orderNumber ?? order.id.slice(0, 8)}</h2>
                <span className="ui-chip-brand rounded-full px-3 py-1 text-xs font-bold">
                  {order.statusLabel ?? order.statusCode ?? t('noStatus')}
                </span>
              </div>

              <div className="ui-text-muted grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p className="inline-flex items-center gap-2"><Store className="h-4 w-4" />{order.restaurant?.name ?? t('restaurantFallback')}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{new Date(order.createdAt).toLocaleString('es-CR')}</p>
                <p className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" />{order.paymentMethod ?? t('paymentUnavailable')}</p>
                <p className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" />₡{Math.round(order.total).toLocaleString()}</p>
              </div>

              <p className="ui-text-muted inline-flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4" />
                {order.deliveryAddress ?? t('noAddress')}
              </p>

              {order.notes ? <p className="ui-text-muted text-sm">{t('notes')}: {order.notes}</p> : null}
            </section>

            <section className="ui-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black">{t('products')}</h3>
              {normalizedItems.length === 0 ? (
                <p className="ui-text-muted text-sm">{t('productsEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {normalizedItems.map((item, index) => (
                    <article key={`${item.name}-${index}`} className="ui-panel-soft rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold">{item.name}</p>
                        <p className="ui-text-muted text-xs">x{item.quantity}</p>
                      </div>
                      {item.price != null ? <p className="ui-text-muted text-xs">₡{Math.round(item.price).toLocaleString()}</p> : null}
                      {item.notes ? <p className="ui-text-muted text-xs">{item.notes}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="ui-panel rounded-2xl p-5 space-y-3">
              <h3 className="inline-flex items-center gap-2 text-sm font-black">
                <Gavel className="h-4 w-4 text-[var(--color-brand)]" />
                {t('bidSection')}
              </h3>

              {order.bids.length === 0 ? (
                <p className="ui-text-muted text-sm">{t('bidSectionEmpty')}</p>
              ) : (
                <div className="space-y-2">
                  {order.bids.map((bid) => (
                    <article key={bid.id} className="ui-panel-soft rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black">{t('bid')} {bid.id.slice(0, 8)}</p>
                        <span className="ui-chip-brand rounded-full px-2 py-1 text-[10px] font-bold">{bid.status || 'unknown'}</span>
                      </div>
                      <div className="ui-text-muted flex flex-wrap gap-3 text-xs">
                        <span>{t('offer')}: ₡{Math.round(bid.driverOffer).toLocaleString()}</span>
                        <span>{t('base')}: ₡{Math.round(bid.basePrice).toLocaleString()}</span>
                        {bid.finalPrice > 0 ? <span>{t('final')}: ₡{Math.round(bid.finalPrice).toLocaleString()}</span> : null}
                        {bid.estimatedTimeMinutes != null ? <span>{t('eta')}: {bid.estimatedTimeMinutes} min</span> : null}
                        {bid.driverRatingSnapshot != null ? <span>{t('rating')}: {bid.driverRatingSnapshot.toFixed(1)}</span> : null}
                      </div>
                      {bid.driverNotes ? <p className="ui-text-muted text-xs">{bid.driverNotes}</p> : null}
                      <p className="ui-text-muted text-[11px]">{new Date(bid.createdAt).toLocaleString('es-CR')}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>

            {reviewsEnabled && (
              <section id="reviews" ref={reviewsRef} className="ui-panel rounded-2xl p-5 space-y-4">
                <div>
                  <h3 className="text-sm font-black">{t('reviews.title')}</h3>
                  <p className="ui-text-muted text-xs">{t('reviews.subtitle')}</p>
                </div>

                {loadingEligibility && (
                  <p className="ui-text-muted text-sm">{t('reviews.loading')}</p>
                )}

                {eligibilityError && (
                  <div className="ui-state-danger rounded-xl px-3 py-2 text-xs">{eligibilityError}</div>
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
                      <div className="ui-state-danger rounded-xl px-3 py-2 text-xs">
                        {restaurantSubmitError || deliverySubmitError}
                      </div>
                    )}
                  </div>
                )}
              </section>
            )}
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
