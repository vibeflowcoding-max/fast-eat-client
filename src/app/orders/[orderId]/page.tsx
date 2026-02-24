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
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header className="space-y-3">
          <button
            type="button"
            onClick={() => router.push('/orders')}
            className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a pedidos
          </button>

          <div>
            <h1 className="text-2xl font-black text-gray-900">Detalle del pedido</h1>
            <p className="text-sm text-gray-500">Incluye estado, productos y todas las pujas registradas.</p>
          </div>
        </header>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando detalle...
          </div>
        )}

        {error && <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>}

        {!loading && !error && !order && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600">
            No encontramos información para este pedido.
          </div>
        )}

        {!loading && !error && order && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-lg font-black text-gray-900">{order.orderNumber ?? order.id.slice(0, 8)}</h2>
                <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-bold text-blue-700">
                  {order.statusLabel ?? order.statusCode ?? 'Sin estado'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-gray-700">
                <p className="inline-flex items-center gap-2"><Store className="w-4 h-4 text-gray-500" />{order.restaurant?.name ?? 'Restaurante'}</p>
                <p className="inline-flex items-center gap-2"><Clock3 className="w-4 h-4 text-gray-500" />{new Date(order.createdAt).toLocaleString('es-CR')}</p>
                <p className="inline-flex items-center gap-2"><Wallet className="w-4 h-4 text-gray-500" />{order.paymentMethod ?? 'Método no disponible'}</p>
                <p className="inline-flex items-center gap-2"><ClipboardList className="w-4 h-4 text-gray-500" />₡{Math.round(order.total).toLocaleString()}</p>
              </div>

              <p className="text-sm text-gray-700 inline-flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-500 mt-0.5" />
                {order.deliveryAddress ?? 'Sin dirección registrada'}
              </p>

              {order.notes ? <p className="text-sm text-gray-600">Notas: {order.notes}</p> : null}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900">Productos del pedido</h3>
              {normalizedItems.length === 0 ? (
                <p className="text-sm text-gray-600">No hay detalle de productos para este pedido.</p>
              ) : (
                <div className="space-y-2">
                  {normalizedItems.map((item, index) => (
                    <article key={`${item.name}-${index}`} className="rounded-xl border border-gray-200 p-3">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-bold text-gray-900">{item.name}</p>
                        <p className="text-xs text-gray-600">x{item.quantity}</p>
                      </div>
                      {item.price != null ? <p className="text-xs text-gray-600">₡{Math.round(item.price).toLocaleString()}</p> : null}
                      {item.notes ? <p className="text-xs text-gray-500">{item.notes}</p> : null}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900 inline-flex items-center gap-2">
                <Gavel className="w-4 h-4 text-indigo-600" />
                Pujas del pedido
              </h3>

              {order.bids.length === 0 ? (
                <p className="text-sm text-gray-600">No hay pujas registradas para este pedido.</p>
              ) : (
                <div className="space-y-2">
                  {order.bids.map((bid) => (
                    <article key={bid.id} className="rounded-xl border border-indigo-100 bg-indigo-50 p-3 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-xs font-black text-indigo-900">Puja {bid.id.slice(0, 8)}</p>
                        <span className="rounded-full bg-white px-2 py-1 text-[10px] font-bold text-indigo-700">{bid.status || 'unknown'}</span>
                      </div>
                      <div className="flex flex-wrap gap-3 text-xs text-indigo-800">
                        <span>Oferta: ₡{Math.round(bid.driverOffer).toLocaleString()}</span>
                        <span>Base: ₡{Math.round(bid.basePrice).toLocaleString()}</span>
                        {bid.finalPrice > 0 ? <span>Final: ₡{Math.round(bid.finalPrice).toLocaleString()}</span> : null}
                        {bid.estimatedTimeMinutes != null ? <span>ETA: {bid.estimatedTimeMinutes} min</span> : null}
                        {bid.driverRatingSnapshot != null ? <span>Rating: {bid.driverRatingSnapshot.toFixed(1)}</span> : null}
                      </div>
                      {bid.driverNotes ? <p className="text-xs text-indigo-700">{bid.driverNotes}</p> : null}
                      <p className="text-[11px] text-indigo-700">{new Date(bid.createdAt).toLocaleString('es-CR')}</p>
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
