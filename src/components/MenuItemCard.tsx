
/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';
import { useDietaryGuardian } from '../features/home-discovery/hooks/useDietaryGuardian';
import { ShieldCheck, ShieldAlert, Loader2, Plus, Pencil } from 'lucide-react';

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
    <article
      id={`item-${item.id}`}
      className={`ui-list-card rounded-2xl border p-4 transition-colors ${isHighlighted ? 'border-[var(--color-brand)]' : 'border-[var(--color-border)]'}`}
    >
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold leading-tight text-[var(--color-text)]">
              {item.name}
            </h3>
            {isHighlighted ? (
              <span className="ui-status-pill !px-2 !py-0.5 text-[10px]">IA</span>
            ) : null}
          </div>

          <p className="mt-1 text-sm leading-5 text-[var(--color-text-muted)] line-clamp-2">
            {item.description}
          </p>

          {item.hasStructuredCustomization ? (
            <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--color-brand)]">
              Personalizable con extras y selecciones
            </p>
          ) : null}

          {isDietaryGuardianEnabled && isActive && (
            <div className="mt-3">
            {loadingMap[item.id] ? (
              <div className="ui-panel-soft flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold italic ui-text-muted">
                <Loader2 className="w-3 h-3 animate-spin" />
                <span>Analizando ingredientes...</span>
              </div>
            ) : resultsMap[item.id] ? (
              <div
                className={`flex max-w-full items-start gap-2 rounded-2xl px-3 py-2 text-[10px] font-bold shadow-sm ${resultsMap[item.id].is_safe
                  ? 'ui-state-success shadow-emerald-500/5'
                  : 'ui-state-danger shadow-red-500/5'
                  }`}
              >
                {resultsMap[item.id].is_safe ? (
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                ) : (
                  <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                )}
                <span className="flex-1 break-words leading-relaxed italic">&ldquo;{resultsMap[item.id].reason}&rdquo;</span>
              </div>
            ) : null}
            </div>
          )}

          <div className="mt-3 flex items-end justify-between gap-3">
            <div>
              <p className="text-base font-bold text-[var(--color-brand)]">₡{item.price.toLocaleString()}</p>
              {currentQuantity > 0 ? (
                <p className="mt-1 text-[11px] font-semibold text-[var(--color-text-muted)]">
                  {currentQuantity} en tu pedido
                </p>
              ) : null}
            </div>
          </div>
        </div>

        <div className="relative h-24 w-24 shrink-0 overflow-visible rounded-xl bg-[var(--color-surface-muted)]">
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
            <div className="flex h-full w-full items-center justify-center rounded-xl bg-[var(--color-surface-strong)] text-[var(--color-text-muted)]">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em]">Sin foto</span>
            </div>
          )}

          {currentQuantity > 0 ? (
            <div className="absolute left-2 top-2 rounded-full bg-white/92 px-2 py-1 text-[10px] font-bold text-[var(--color-text)] shadow-sm">
              {currentQuantity}
            </div>
          ) : null}

          <button
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
            className="ui-btn-primary absolute -bottom-2 -right-2 flex h-9 w-9 items-center justify-center rounded-full border border-white shadow-lg disabled:opacity-60"
          >
            {currentQuantity > 0 ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {syncError ? (
        <p className="mt-3 text-[11px] font-semibold text-[var(--color-brand)]">{syncError}</p>
      ) : null}

      {isAdding ? (
        <div className="animate-fadeIn relative mt-4 space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface-muted)] p-4">
            {isSyncing && (
              <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl bg-white/80 backdrop-blur-[2px]">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-black border-t-[var(--color-brand)]"></div>
              </div>
            )}

            <div className="flex items-center justify-between gap-3">
              <span className="text-[11px] font-bold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">Cantidad</span>
              <div className="flex items-center overflow-hidden rounded-full border border-[var(--color-border)] bg-white shadow-sm">
                <button type="button" aria-label={`Reducir cantidad de ${item.name}`} disabled={isSyncing} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="flex h-10 w-10 items-center justify-center text-xl font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-brand-soft)] disabled:opacity-30">−</button>
                <div className="w-10 text-center text-sm font-bold text-[var(--color-text)]">{quantity}</div>
                <button type="button" aria-label={`Aumentar cantidad de ${item.name}`} disabled={isSyncing} onClick={() => setQuantity(quantity + 1)} className="flex h-10 w-10 items-center justify-center text-xl font-bold text-[var(--color-text)] transition-colors hover:bg-[var(--color-brand-soft)] disabled:opacity-30">+</button>
              </div>
            </div>

            <div>
              <textarea
                disabled={isSyncing}
                placeholder="Notas (ej. sin cebolla)..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                className="ui-textarea w-full rounded-2xl px-4 py-3 text-sm disabled:opacity-50"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" disabled={isSyncing} onClick={() => { setIsAdding(false); setSyncError(null); }} className="ui-btn-secondary rounded-full px-4 py-3 text-xs font-bold disabled:opacity-30">Cerrar</button>
              <button type="button" disabled={isSyncing} onClick={handleUpdate} className="ui-btn-primary flex-1 rounded-full px-5 py-3 text-xs font-bold disabled:opacity-60">
                  {isSyncing ? 'Guardando...' : 'Confirmar'}
                </button>
              {currentQuantity > 0 && (
                <button type="button" disabled={isSyncing} onClick={handleRemove} className="w-full py-2 text-xs font-bold text-[var(--color-brand)]/70 transition-colors hover:text-[var(--color-brand)] disabled:opacity-20 sm:w-auto sm:px-2">
                  Quitar del pedido
                </button>
              )}
            </div>
        </div>
      ) : null}
    </article>
  );
};

export default React.memo(MenuItemCard, (prev, next) =>
  prev.item.id === next.item.id &&
  prev.currentQuantity === next.currentQuantity &&
  prev.isHighlighted === next.isHighlighted &&
  prev.onAddToCart === next.onAddToCart
);
