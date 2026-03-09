
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';
import { useDietaryGuardian } from '../features/home-discovery/hooks/useDietaryGuardian';
import { ShieldCheck, ShieldAlert, Loader2, Plus, Pencil } from 'lucide-react';
import { Badge, Button, QuantitySelector, Surface } from '@/../resources/components';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (cartItem: CartItem) => Promise<boolean>;
  currentQuantity: number;
  isHighlighted?: boolean;
  onOpenDetails?: (itemId: string) => void;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart, currentQuantity, isHighlighted, onOpenDetails }) => {
  const [quantity, setQuantity] = useState(currentQuantity > 0 ? currentQuantity : 1);
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const syncQuantity = React.useEffectEvent((nextQuantity: number) => {
    setQuantity(nextQuantity);
  });

  const { isActive, checkItem, loadingMap, resultsMap } = useDietaryGuardian();
  const isDietaryGuardianEnabled = process.env.NEXT_PUBLIC_HOME_DIETARY_GUARDIAN?.toLowerCase() !== 'false';

  useEffect(() => {
    if (!isDietaryGuardianEnabled || !isActive || resultsMap[item.id] || loadingMap[item.id]) return;
    const schedule = typeof requestIdleCallback !== 'undefined'
      ? (cb: () => void) => requestIdleCallback(cb, { timeout: 2000 })
      : (cb: () => void) => window.setTimeout(cb, 200);
    const cancel = typeof cancelIdleCallback !== 'undefined' ? cancelIdleCallback : window.clearTimeout;
    const id = schedule(() => checkItem(item));
    return () => cancel(id as number);
  }, [isDietaryGuardianEnabled, isActive, item, checkItem, resultsMap, loadingMap]);

  useEffect(() => {
    if (!isAdding && currentQuantity > 0) {
      syncQuantity(currentQuantity);
    }
  }, [currentQuantity, isAdding]);

  const handleUpdate = async () => {
    setIsSyncing(true);
    setSyncError(null);
    const success = await onAddToCart({ ...item, quantity, notes });
    if (success) {
      setIsAdding(false);
    } else {
      setSyncError("Error al sincronizar. Reintente por favor.");
    }
    setIsSyncing(false);
  };

  const handleQuickAdd = async () => {
    if (item.hasStructuredCustomization && onOpenDetails) {
      onOpenDetails(item.id);
      return;
    }

    setIsSyncing(true);
    setSyncError(null);
    const success = await onAddToCart({ ...item, quantity: 1, notes: '' });
    if (!success) {
      setSyncError('Error al sincronizar. Reintente por favor.');
    }
    setIsSyncing(false);
  };

  const handleRemove = async () => {
    setIsSyncing(true);
    setSyncError(null);
    const success = await onAddToCart({ ...item, quantity: 0, notes: '' });
    if (success) {
      setIsAdding(false);
      setQuantity(1);
      setNotes('');
    } else {
      setSyncError("No se pudo quitar del pedido.");
    }
    setIsSyncing(false);
  };

  return (
    <Surface
      id={`item-${item.id}`}
      className={`rounded-2xl border p-4 transition-colors ${isHighlighted ? 'border-orange-300' : 'border-slate-200 dark:border-slate-800'}`}
      variant="base"
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold leading-tight text-slate-900 dark:text-slate-100">
              {item.name}
            </h3>
            {isHighlighted ? (
              <Badge className="text-[10px]" variant="brand">IA</Badge>
            ) : null}
          </div>

          <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500 dark:text-slate-400">
            {item.description}
          </p>

          {item.hasStructuredCustomization ? (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-orange-600 dark:text-orange-300">
              Personalizable con extras y selecciones
            </p>
          ) : null}

          {isDietaryGuardianEnabled && isActive && (
            <div className="mt-3">
            {loadingMap[item.id] ? (
              <Badge className="px-3 py-1.5 text-[10px] font-bold italic" leading={<Loader2 className="h-3 w-3 animate-spin" />} variant="neutral">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analizando ingredientes...</span>
              </Badge>
            ) : resultsMap[item.id] ? (
              <Surface
                className={`flex max-w-full items-start gap-2 rounded-2xl px-3 py-2 text-[10px] font-bold shadow-sm ${resultsMap[item.id].is_safe
                  ? 'text-emerald-700 dark:text-emerald-200'
                  : 'text-red-700 dark:text-red-200'
                  }`}
                padding="none"
                variant={resultsMap[item.id].is_safe ? 'muted' : 'raised'}
              >
                {resultsMap[item.id].is_safe ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-orange-600 dark:text-orange-300" />
                )}
                <span className="flex-1 break-words leading-relaxed italic">&ldquo;{resultsMap[item.id].reason}&rdquo;</span>
              </Surface>
            ) : null}
            </div>
          )}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-bold text-orange-600 dark:text-orange-300">₡{item.price.toLocaleString()}</p>
              {currentQuantity > 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                  {currentQuantity} en tu pedido
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative h-24 w-24 shrink-0 overflow-visible rounded-xl bg-[#f4eee8] dark:bg-slate-800">
          {item.image ? (
            <img
              src={item.image}
              alt={item.name}
              className="h-full w-full rounded-xl object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800';
              }}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[#eadfd4] text-slate-500 dark:bg-slate-700 dark:text-slate-400">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Sin foto</span>
            </div>
          )}

          {currentQuantity > 0 ? (
            <Badge className="absolute left-2 top-2 bg-white/92 px-2 py-1 text-[10px] font-bold text-slate-900 shadow-sm dark:bg-slate-900/92 dark:text-slate-100" variant="neutral">
              {currentQuantity}
            </Badge>
          ) : null}

          <Button
            type="button"
            disabled={isSyncing}
            aria-label={currentQuantity > 0 ? `Editar ${item.name}` : `Añadir ${item.name}`}
            onClick={() => {
              if (item.hasStructuredCustomization && onOpenDetails) {
                onOpenDetails(item.id);
                return;
              }

              if (currentQuantity > 0) {
                setIsAdding((previous) => !previous);
                setSyncError(null);
                return;
              }

              void handleQuickAdd();
            }}
            className="absolute -bottom-2 -right-2 h-9 w-9 rounded-full border border-white shadow-lg"
            size="icon"
          >
            {currentQuantity > 0 ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {syncError ? (
        <p className="mt-3 text-[11px] font-semibold text-orange-600 dark:text-orange-300">{syncError}</p>
      ) : null}

      {isAdding ? (
        <Surface className="animate-fadeIn relative mt-4 space-y-4 rounded-2xl border border-slate-200 dark:border-slate-700" variant="muted">
            {isSyncing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px] dark:bg-slate-900/80">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-900 border-t-orange-600 dark:border-slate-100 dark:border-t-orange-300"></div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">Cantidad</span>
              <QuantitySelector
                decrementLabel={`Reducir cantidad de ${item.name}`}
                disabled={isSyncing}
                incrementLabel={`Aumentar cantidad de ${item.name}`}
                onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
                onIncrement={() => setQuantity(quantity + 1)}
                value={quantity}
              />
            </div>

            <div>
              <textarea
                disabled={isSyncing}
                placeholder="Notas (ej. sin cebolla)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition-colors placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button disabled={isSyncing} onClick={() => { setIsAdding(false); setSyncError(null); }} type="button" variant="outline">
                Cerrar
              </Button>
              <Button disabled={isSyncing} fullWidth onClick={handleUpdate} type="button">
                  {isSyncing ? 'Guardando...' : 'Confirmar'}
                </Button>
              {currentQuantity > 0 && (
                <Button disabled={isSyncing} onClick={handleRemove} type="button" variant="ghost">
                  Quitar del pedido
                </Button>
              )}
            </div>
        </Surface>
      ) : null}
    </Surface>
  );
};

export default React.memo(MenuItemCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.currentQuantity === next.currentQuantity &&
  prev.isHighlighted === next.isHighlighted &&
  prev.onAddToCart === next.onAddToCart
);
