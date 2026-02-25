"use client";

import React from 'react';
import { useParams } from 'next/navigation';
import { ArrowLeft, Clock3, Store, MapPin, Wallet, ClipboardList, Gavel, Loader2 } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';

type OrderBid = {
  id: string;
  status: string;
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
  restaurant: { id: string; name: string; logo_url: string | null } | null;
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
            : 'Producto';

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
  const params = useParams<{ orderId: string }>();
  const router = useAppRouter();
  const { fromNumber } = useCartStore();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [order, setOrder] = React.useState<OrderDetail | null>(null);

  React.useEffect(() => {
    async function fetchDetail() {
      setLoading(true);
      setError(null);

      try {
        if (!params?.orderId) {
          throw new Error('Pedido inválido');
        }

        if (!fromNumber) {
          throw new Error('No hay teléfono de sesión para validar este pedido');
        }

        const response = await fetch(
          `/api/orders/${encodeURIComponent(params.orderId)}?phone=${encodeURIComponent(fromNumber)}`
        );
        const data = await response.json();

        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo cargar el detalle del pedido');
        }

        setOrder(data.order ?? null);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el detalle del pedido');
      } finally {
        setLoading(false);
      }
    }

    fetchDetail();
  }, [fromNumber, params?.orderId]);

  const normalizedItems = React.useMemo(() => normalizeItems(order?.items ?? []), [order?.items]);

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
            Volver a pedidos
          </button>

          <div>
            <h1 className="text-2xl font-black">Detalle del pedido</h1>
            <p className="ui-text-muted text-sm">Incluye estado, productos y todas las pujas registradas.</p>
          </div>
        </header>

        {loading && (
          <div className="ui-panel ui-text-muted flex items-center gap-2 rounded-2xl p-5 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando detalle...
          </div>
        )}

        {error && <div className="ui-state-danger rounded-2xl p-5 text-sm">{error}</div>}

        {!loading && !error && !order && (
          <div className="ui-panel ui-text-muted rounded-2xl p-5 text-sm">
            No encontramos información para este pedido.
          </div>
        )}

        {!loading && !error && order && (
          <>
            <section className="ui-panel rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black">{order.orderNumber ?? order.id.slice(0, 8)}</h2>
                <span className="ui-chip-brand rounded-full px-3 py-1 text-xs font-bold">
                  {order.statusLabel ?? order.statusCode ?? 'Sin estado'}
                </span>
              </div>

              <div className="ui-text-muted grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <p className="inline-flex items-center gap-2"><Store className="h-4 w-4" />{order.restaurant?.name ?? 'Restaurante'}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="h-4 w-4" />{new Date(order.createdAt).toLocaleString('es-CR')}</p>
                <p className="inline-flex items-center gap-2"><Wallet className="h-4 w-4" />{order.paymentMethod ?? 'Método no disponible'}</p>
                <p className="inline-flex items-center gap-2"><ClipboardList className="h-4 w-4" />₡{Math.round(order.total).toLocaleString()}</p>
              </div>

              <p className="ui-text-muted inline-flex items-start gap-2 text-sm">
                <MapPin className="mt-0.5 h-4 w-4" />
                {order.deliveryAddress ?? 'Sin dirección registrada'}
              </p>

              {order.notes ? <p className="ui-text-muted text-sm">Notas: {order.notes}</p> : null}
            </section>

            <section className="ui-panel rounded-2xl p-5 space-y-3">
              <h3 className="text-sm font-black">Productos del pedido</h3>
              {normalizedItems.length === 0 ? (
                <p className="ui-text-muted text-sm">No hay detalle de productos para este pedido.</p>
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
                Pujas del pedido
              </h3>

              {order.bids.length === 0 ? (
                <p className="ui-text-muted text-sm">No hay pujas registradas para este pedido.</p>
              ) : (
                <div className="space-y-2">
                  {order.bids.map((bid) => (
                    <article key={bid.id} className="ui-panel-soft rounded-xl p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black">Puja {bid.id.slice(0, 8)}</p>
                        <span className="ui-chip-brand rounded-full px-2 py-1 text-[10px] font-bold">{bid.status || 'unknown'}</span>
                      </div>
                      <div className="ui-text-muted flex flex-wrap gap-3 text-xs">
                        <span>Oferta: ₡{Math.round(bid.driverOffer).toLocaleString()}</span>
                        <span>Base: ₡{Math.round(bid.basePrice).toLocaleString()}</span>
                        {bid.finalPrice > 0 ? <span>Final: ₡{Math.round(bid.finalPrice).toLocaleString()}</span> : null}
                        {bid.estimatedTimeMinutes != null ? <span>ETA: {bid.estimatedTimeMinutes} min</span> : null}
                        {bid.driverRatingSnapshot != null ? <span>Rating: {bid.driverRatingSnapshot.toFixed(1)}</span> : null}
                      </div>
                      {bid.driverNotes ? <p className="ui-text-muted text-xs">{bid.driverNotes}</p> : null}
                      <p className="ui-text-muted text-[11px]">{new Date(bid.createdAt).toLocaleString('es-CR')}</p>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
