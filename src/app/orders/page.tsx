"use client";

import React from 'react';
import { Clock3, PackageCheck, Loader2, Gavel, ArrowRight } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';

type ApiOrder = {
  id: string;
  orderNumber: string | null;
  statusCode: string | null;
  statusLabel: string | null;
  total: number;
  createdAt: string;
  bidCount: number;
  bestBid: number | null;
  restaurant: { id: string; name: string; logo_url: string | null } | null;
};

export default function OrdersPage() {
  const router = useAppRouter();
  const { activeOrders, bidsByOrderId, fromNumber } = useCartStore();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [activeFromApi, setActiveFromApi] = React.useState<ApiOrder[]>([]);
  const [pastOrders, setPastOrders] = React.useState<ApiOrder[]>([]);

  const refreshOrders = React.useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      if (!fromNumber) {
        setActiveFromApi([]);
        setPastOrders([]);
        return;
      }

      const response = await fetch(`/api/orders/history?phone=${encodeURIComponent(fromNumber)}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(typeof data.error === 'string' ? data.error : 'No se pudieron cargar las órdenes');
      }

      setActiveFromApi(Array.isArray(data.activeOrders) ? data.activeOrders : []);
      setPastOrders(Array.isArray(data.pastOrders) ? data.pastOrders : []);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No se pudieron cargar las órdenes');
    } finally {
      setLoading(false);
    }
  }, [fromNumber]);

  React.useEffect(() => {
    refreshOrders();
  }, [refreshOrders]);

  const activeFromStore = React.useMemo(() => Object.values(activeOrders), [activeOrders]);
  const mergedActiveCount = activeFromStore.length + activeFromApi.length;

  return (
    <main className="ui-page min-h-screen pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black">Tus pedidos</h1>
          <p className="ui-text-muted text-sm">Pedidos activos, pujas de delivery y pedidos anteriores.</p>
        </header>

        {loading && (
          <div className="ui-panel ui-text-muted flex items-center gap-2 rounded-2xl p-5 text-sm">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando tus pedidos...
          </div>
        )}

        {error && (
          <div className="ui-state-danger rounded-2xl p-5 text-sm">{error}</div>
        )}

        {!loading && !error && (
          <section className="ui-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-black">Pedidos activos</h2>

            {mergedActiveCount === 0 ? (
              <div className="space-y-3">
                <p className="ui-text-muted text-sm">No tienes pedidos activos en este momento.</p>
                <button
                  type="button"
                  onClick={() => router.push('/')}
                  className="ui-btn-primary inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold transition-colors"
                >
                  Start Ordering
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeFromStore.map((order) => (
                  <article
                    key={order.orderId}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${order.orderId}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/orders/${order.orderId}`);
                      }
                    }}
                    className="ui-chip-brand rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <p className="text-xs font-black">{order.orderNumber || order.orderId}</p>
                    <p className="text-sm">Estado: {order.newStatus?.label ?? order.newStatus?.code ?? 'En proceso'}</p>
                    <p className="text-xs">Total: ₡{Math.round(order.total ?? 0).toLocaleString()}</p>
                    <p className="text-xs">Pujas activas: {(bidsByOrderId[order.orderId] ?? []).length}</p>
                  </article>
                ))}

                {activeFromApi.map((order) => (
                  <article
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/orders/${order.id}`);
                      }
                    }}
                    className="ui-panel-soft rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <span className="ui-chip-brand rounded-full px-2 py-1 text-[10px] font-bold">{order.statusLabel ?? order.statusCode ?? 'Activo'}</span>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? 'Restaurante'}</p>
                    <div className="ui-text-muted flex flex-wrap gap-3 text-xs">
                      <span className="inline-flex items-center gap-1"><Clock3 className="w-3 h-3" />{new Date(order.createdAt).toLocaleString('es-CR')}</span>
                      <span className="inline-flex items-center gap-1"><Gavel className="w-3 h-3" />{order.bidCount} pujas</span>
                      {order.bestBid ? <span>Mejor puja: ₡{Math.round(order.bestBid).toLocaleString()}</span> : null}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {!loading && !error && (
          <section className="ui-panel rounded-2xl p-4 space-y-3">
            <h2 className="text-sm font-black">Pedidos anteriores</h2>
            {pastOrders.length === 0 ? (
              <p className="ui-text-muted text-sm">Todavía no tienes historial de pedidos.</p>
            ) : (
              <div className="space-y-2">
                {pastOrders.map((order) => (
                  <article
                    key={order.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/orders/${order.id}`)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault();
                        router.push(`/orders/${order.id}`);
                      }
                    }}
                    className="ui-panel-soft rounded-xl p-3 space-y-2 cursor-pointer"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-xs font-black">{order.orderNumber ?? order.id.slice(0, 8)}</p>
                      <span className="ui-text-muted text-[11px]">{new Date(order.createdAt).toLocaleDateString('es-CR')}</span>
                    </div>
                    <p className="text-sm">{order.restaurant?.name ?? 'Restaurante'}</p>
                    <div className="flex items-center justify-between">
                      <span className="ui-text-muted inline-flex items-center gap-1 text-xs">
                        <PackageCheck className="w-3 h-3" />
                        {order.statusLabel ?? order.statusCode ?? 'Completado'}
                      </span>
                      <span className="text-sm font-bold">₡{Math.round(order.total).toLocaleString()}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => router.push('/')}
                      className="text-xs font-bold text-[var(--color-brand)] hover:text-[var(--color-brand-strong)]"
                    >
                      Repetir pedido
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
