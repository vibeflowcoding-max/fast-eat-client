'use client';

import React from 'react';
import { ArrowRight, Gift, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import { useTranslations } from 'next-intl';
import BottomNav from '@/components/BottomNav';
import { Badge, Button, ChoiceCard, FieldLabel, SectionHeader, Surface, TextField } from '@/../resources/components';
import { acceptMysteryBoxOffer, fetchMysteryBoxOffers } from '@/services/api';
import { MysteryBoxOffer, MysteryBoxOffersResponse } from '@/types';
import { useCartStore } from '@/store';
import { useAppRouter } from '@/hooks/useAppRouter';

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null;
}

function resolveAcceptedOrderId(payload: unknown): string | null {
  const root = asRecord(payload);
  const order = asRecord(root?.order);
  const acceptedOrder = asRecord(root?.acceptedOrder);
  const candidates = [
    root?.orderId,
    root?.order_id,
    order?.id,
    acceptedOrder?.id,
  ];

  return candidates.find((value): value is string => typeof value === 'string' && value.trim().length > 0) || null;
}

export default function MysteryBoxPage() {
  const t = useTranslations('mysteryBox');
  const router = useAppRouter();
  const { isAuthenticated } = useCartStore();

  const [loading, setLoading] = React.useState(false);
  const [acceptingOfferId, setAcceptingOfferId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const [offersPayload, setOffersPayload] = React.useState<MysteryBoxOffersResponse | null>(null);
  const [maxPrice, setMaxPrice] = React.useState('8000');
  const [serviceMode, setServiceMode] = React.useState<'delivery' | 'pickup'>('delivery');
  const [acceptFeedback, setAcceptFeedback] = React.useState<string | null>(null);
  const [acceptedOrderId, setAcceptedOrderId] = React.useState<string | null>(null);
  const serviceModeOptions = React.useMemo(() => ([
    {
      value: 'delivery',
      title: t('serviceModes.delivery.title'),
      description: t('serviceModes.delivery.description'),
    },
    {
      value: 'pickup',
      title: t('serviceModes.pickup.title'),
      description: t('serviceModes.pickup.description'),
    },
  ] as const), [t]);

  const loadOffers = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetchMysteryBoxOffers({
        limit: 6,
        maxPrice: maxPrice ? Number(maxPrice) : undefined,
        serviceMode,
      });
      setOffersPayload(response);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('loadError'));
    } finally {
      setLoading(false);
    }
  }, [maxPrice, serviceMode, t]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadOffers();
  }, [isAuthenticated, loadOffers]);

  const handleAccept = React.useCallback(async (offer: MysteryBoxOffer) => {
    if (!offer.id) {
      setError(t('cannotAcceptYet'));
      return;
    }

    setAcceptingOfferId(offer.id);
    setAcceptFeedback(null);
    setAcceptedOrderId(null);
    setError(null);

    try {
      const response = await acceptMysteryBoxOffer(offer.id);
      const nextOrderId = resolveAcceptedOrderId(response);
      setAcceptFeedback(t('acceptSuccess'));
      setAcceptedOrderId(nextOrderId);
      await loadOffers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : t('acceptError'));
    } finally {
      setAcceptingOfferId(null);
    }
  }, [loadOffers, t]);

  return (
    <main className="min-h-screen bg-[#f8f6f2] pb-32 text-slate-900 dark:bg-[#221610] dark:text-slate-100">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <Surface className="rounded-[2rem]" variant="raised" padding="lg">
          <SectionHeader
            eyebrow={t('eyebrow')}
            title={t('title')}
            description={t('description')}
          />
        </Surface>

        {!isAuthenticated ? (
          <Surface className="rounded-[2rem] text-sm" variant="base" padding="lg">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <p className="font-black">{t('authTitle')}</p>
                <p className="text-slate-500 dark:text-slate-400">{t('authDescription')}</p>
              </div>
            </div>
          </Surface>
        ) : (
          <>
            <Surface className="space-y-5 rounded-[2rem]" variant="base" padding="lg">
              <SectionHeader
                eyebrow={t('filtersEyebrow')}
                title={t('filtersTitle')}
                description={t('filtersDescription')}
                action={<Gift className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-300" />}
              />

              <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <TextField
                  type="number"
                  min="0"
                  step="500"
                  inputMode="numeric"
                  label={t('maxPriceLabel')}
                  description={t('maxPriceDescription')}
                  value={maxPrice}
                  onChange={(event) => setMaxPrice(event.target.value)}
                />

                <div className="space-y-2">
                  <FieldLabel
                    label={t('serviceModeLabel')}
                    description={t('serviceModeDescription')}
                  />
                  <div className="grid gap-2">
                    {serviceModeOptions.map((option) => (
                      <ChoiceCard
                        key={option.value}
                        title={option.title}
                        description={option.description}
                        checked={serviceMode === option.value}
                        onClick={() => setServiceMode(option.value)}
                        type="radio"
                      />
                    ))}
                  </div>
                </div>
              </div>

              <Button
                onClick={loadOffers}
                disabled={loading}
                leadingIcon={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                size="md"
              >
                {t('search')}
              </Button>

              {acceptFeedback ? (
                <Surface className="inline-flex rounded-xl px-3 py-2 text-xs font-semibold text-emerald-700 dark:text-emerald-200" variant="muted" padding="none">
                  {acceptFeedback}
                </Surface>
              ) : null}
              {acceptedOrderId ? (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => router.push(`/orders/${acceptedOrderId}`)}
                  leadingIcon={<ArrowRight className="h-4 w-4" />}
                >
                  {t('viewCreatedOrder')}
                </Button>
              ) : null}
            </Surface>

            {error ? (
              <Surface className="rounded-[1.7rem] text-sm text-red-700 dark:text-red-200" variant="raised">
                {error}
              </Surface>
            ) : null}

            {offersPayload && offersPayload.offers.length === 0 ? (
              <Surface className="rounded-[2rem] text-sm" variant="base" padding="lg">
                {t('empty')}
              </Surface>
            ) : null}

            <section className="space-y-3">
              {(offersPayload?.offers || []).map((offer) => (
                <Surface key={offer.id || offer.title} className="space-y-4 rounded-[2rem]" variant="base" padding="lg">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <Badge variant="brand">{offer.restaurant.name || t('restaurantFallback')}</Badge>
                      <h2 className="inline-flex items-center gap-2 text-xl font-black tracking-[-0.02em] text-slate-900 dark:text-slate-100">
                        <Gift className="h-5 w-5 text-fuchsia-600" />
                        {offer.title}
                      </h2>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{offer.description || t('defaultOfferDescription')}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-slate-900 dark:text-slate-100">₡{Math.round(offer.price).toLocaleString()}</p>
                      {offer.originalValue ? (
                        <p className="text-xs text-slate-500 dark:text-slate-400">{t('originalValue', { amount: Math.round(offer.originalValue).toLocaleString() })}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {offer.dietaryTags.map((tag) => (
                      <Badge key={tag} variant="success">
                        {tag}
                      </Badge>
                    ))}
                    {offer.excludedAllergens.map((allergen) => (
                      <Badge key={allergen} variant="warning">
                        {t('excludedAllergen', { allergen })}
                      </Badge>
                    ))}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {offer.itemsPreview.map((item, index) => (
                      <Surface
                        key={`${offer.id || offer.title}-${item.menu_item_name}-${index}`}
                        className="rounded-[1.35rem] px-4 py-3 text-sm"
                        variant="muted"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{item.menu_item_name}</span>
                          <span className="text-xs text-slate-500 dark:text-slate-400">x{item.quantity}</span>
                        </div>
                      </Surface>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {offer.availableUntil ? t('availableUntil', { value: new Date(offer.availableUntil).toLocaleString('es-CR') }) : t('limitedAvailability')}
                    </p>
                    <Button
                      onClick={() => handleAccept(offer)}
                      disabled={!offer.canAccept || !offer.id || acceptingOfferId === offer.id}
                      leadingIcon={acceptingOfferId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : undefined}
                      size="sm"
                    >
                      {offer.canAccept ? t('acceptButton') : t('unavailableButton')}
                    </Button>
                  </div>
                </Surface>
              ))}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}