'use client';

import React from 'react';
import { Gift, Loader2, ShieldAlert, Sparkles } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { acceptMysteryBoxOffer, fetchMysteryBoxOffers } from '@/services/api';
import { MysteryBoxOffer, MysteryBoxOffersResponse } from '@/types';
import { useCartStore } from '@/store';
import { useAppRouter } from '@/hooks/useAppRouter';

function resolveAcceptedOrderId(payload: any): string | null {
  const candidates = [
    payload?.orderId,
    payload?.order_id,
    payload?.order?.id,
    payload?.acceptedOrder?.id,
  ];

  return candidates.find((value) => typeof value === 'string' && value.trim().length > 0) || null;
}

export default function MysteryBoxPage() {
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
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las ofertas.');
    } finally {
      setLoading(false);
    }
  }, [maxPrice, serviceMode]);

  React.useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    loadOffers();
  }, [isAuthenticated, loadOffers]);

  const handleAccept = React.useCallback(async (offer: MysteryBoxOffer) => {
    if (!offer.id) {
      setError('Esta oferta no se puede aceptar todavía.');
      return;
    }

    setAcceptingOfferId(offer.id);
    setAcceptFeedback(null);
    setAcceptedOrderId(null);
    setError(null);

    try {
      const response = await acceptMysteryBoxOffer(offer.id);
      const nextOrderId = resolveAcceptedOrderId(response);
      setAcceptFeedback('Oferta aceptada correctamente.');
      setAcceptedOrderId(nextOrderId);
      await loadOffers();
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudo aceptar la oferta.');
    } finally {
      setAcceptingOfferId(null);
    }
  }, [loadOffers]);

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-4xl px-4 pt-6 space-y-5">
        <header className="ui-panel rounded-[2rem] p-5 md:p-6">
          <div className="space-y-2">
            <p className="ui-section-title">Mystery Box</p>
            <h1 className="text-3xl font-black tracking-[-0.03em] text-[var(--color-text)]">Ofertas sorpresa compatibles contigo</h1>
            <p className="ui-text-muted max-w-2xl text-sm">
              Estas cajas usan disponibilidad dinámica y tu perfil alimenticio para armar combos con descuento y menor desperdicio.
            </p>
          </div>
        </header>

        {!isAuthenticated ? (
          <section className="ui-panel rounded-[2rem] p-5 text-sm text-[var(--color-text)]">
            <div className="flex items-start gap-3">
              <ShieldAlert className="mt-0.5 h-5 w-5 text-amber-600" />
              <div className="space-y-2">
                <p className="font-black">Necesitas iniciar sesión para ver ofertas sorpresa personalizadas.</p>
                <p className="ui-text-muted">La disponibilidad y los filtros dietarios dependen de tu contexto autenticado.</p>
              </div>
            </div>
          </section>
        ) : (
          <>
            <section className="ui-panel rounded-[2rem] p-5 space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="text-sm font-semibold text-[var(--color-text)]">
                  Precio máximo
                  <input
                    type="number"
                    min="0"
                    step="500"
                    value={maxPrice}
                    onChange={(event) => setMaxPrice(event.target.value)}
                    className="ui-input mt-1 rounded-xl px-3 py-2 text-sm"
                  />
                </label>
                <label className="text-sm font-semibold text-[var(--color-text)]">
                  Modalidad
                  <select
                    value={serviceMode}
                    onChange={(event) => setServiceMode(event.target.value as 'delivery' | 'pickup')}
                    className="ui-select mt-1 rounded-xl px-3 py-2 text-sm"
                  >
                    <option value="delivery">Delivery</option>
                    <option value="pickup">Pickup</option>
                  </select>
                </label>
                <div className="flex items-end">
                  <button
                    type="button"
                    onClick={loadOffers}
                    disabled={loading}
                    className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black disabled:opacity-60"
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Buscar ofertas
                  </button>
                </div>
              </div>
              {acceptFeedback ? <p className="ui-state-success inline-flex rounded-xl px-3 py-2 text-xs">{acceptFeedback}</p> : null}
              {acceptedOrderId ? (
                <button
                  type="button"
                  onClick={() => router.push(`/orders/${acceptedOrderId}`)}
                  className="ui-btn-secondary inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-black"
                >
                  Ver orden creada
                </button>
              ) : null}
            </section>

            {error ? <section className="ui-state-danger rounded-[1.7rem] p-4 text-sm">{error}</section> : null}

            {offersPayload && offersPayload.offers.length === 0 ? (
              <section className="ui-panel rounded-[2rem] p-5 text-sm text-[var(--color-text)]">
                No hay mystery boxes disponibles con estos filtros por ahora.
              </section>
            ) : null}

            <section className="space-y-3">
              {(offersPayload?.offers || []).map((offer) => (
                <article key={offer.id || offer.title} className="ui-panel rounded-[2rem] p-5 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="ui-section-title">{offer.restaurant.name || 'Restaurante'}</p>
                      <h2 className="text-xl font-black tracking-[-0.02em] text-[var(--color-text)] inline-flex items-center gap-2">
                        <Gift className="h-5 w-5 text-fuchsia-600" />
                        {offer.title}
                      </h2>
                      <p className="ui-text-muted text-sm">{offer.description || 'Oferta generada con inventario disponible y compatibilidad dietaria.'}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-black text-[var(--color-text)]">₡{Math.round(offer.price).toLocaleString()}</p>
                      {offer.originalValue ? (
                        <p className="ui-text-muted text-xs">Valor original ₡{Math.round(offer.originalValue).toLocaleString()}</p>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {offer.dietaryTags.map((tag) => (
                      <span key={tag} className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        {tag}
                      </span>
                    ))}
                    {offer.excludedAllergens.map((allergen) => (
                      <span key={allergen} className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                        Sin {allergen}
                      </span>
                    ))}
                  </div>

                  <div className="grid gap-2 md:grid-cols-2">
                    {offer.itemsPreview.map((item, index) => (
                      <div key={`${offer.id || offer.title}-${item.menu_item_name}-${index}`} className="ui-list-card rounded-[1.35rem] px-4 py-3 text-sm text-[var(--color-text)]">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold">{item.menu_item_name}</span>
                          <span className="ui-text-muted text-xs">x{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="ui-text-muted text-xs">
                      {offer.availableUntil ? `Disponible hasta ${new Date(offer.availableUntil).toLocaleString('es-CR')}` : 'Disponibilidad limitada'}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleAccept(offer)}
                      disabled={!offer.canAccept || !offer.id || acceptingOfferId === offer.id}
                      className="ui-btn-primary inline-flex items-center gap-2 rounded-full px-5 py-2 text-sm font-black disabled:opacity-60"
                    >
                      {acceptingOfferId === offer.id ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                      {offer.canAccept ? 'Aceptar oferta' : 'No disponible'}
                    </button>
                  </div>
                </article>
              ))}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}