/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { MenuItem, SelectedModifier } from '../types';
import { useDietaryGuardian } from '@/features/home-discovery/hooks/useDietaryGuardian';

interface ItemDetailModalProps {
    item: MenuItem;
    quantity: number;
    setQuantity: (q: number) => void;
    notes: string;
    setNotes: (n: string) => void;
    selectedVariantId: string | null;
    setSelectedVariantId: (variantId: string | null) => void;
    selectedModifiers: SelectedModifier[];
    setSelectedModifiers: (modifiers: SelectedModifier[]) => void;
    onClose: () => void;
    onConfirm: () => void;
    isSyncing: boolean;
    modalScrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
    errorMessage?: string | null;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    quantity,
    setQuantity,
    notes,
    setNotes,
    selectedVariantId,
    setSelectedVariantId,
    selectedModifiers,
    setSelectedModifiers,
    onClose,
    onConfirm,
    isSyncing,
    modalScrollRef,
    onScroll,
    errorMessage,
}) => {
    const { isActive, checkItem, loadingMap, resultsMap } = useDietaryGuardian();
    const isDietaryGuardianEnabled = process.env.NEXT_PUBLIC_HOME_DIETARY_GUARDIAN?.toLowerCase() !== 'false';
    const selectedVariant = (item.variants || []).find((variant) => variant.id === selectedVariantId)
        || (item.variants || []).find((variant) => variant.isDefault)
        || item.variants?.[0]
        || null;
    const modifiersTotal = selectedModifiers.reduce((sum, modifier) => sum + (modifier.priceDelta * modifier.quantity), 0);
    const unitTotal = Number((Number(selectedVariant?.price ?? item.price ?? 0) + modifiersTotal).toFixed(2));
    const total = Number((unitTotal * quantity).toFixed(2));

    React.useEffect(() => {
        if (!isDietaryGuardianEnabled || !isActive || resultsMap[item.id] || loadingMap[item.id]) {
            return;
        }

        void checkItem(item);
    }, [checkItem, isActive, isDietaryGuardianEnabled, item, loadingMap, resultsMap]);

    const toggleModifier = (groupId: string, groupName: string, option: { id: string; name: string; priceDelta: number }, allowMultiple: boolean) => {
        const groupSelections = selectedModifiers.filter((modifier) => modifier.groupId === groupId);
        const alreadySelected = groupSelections.find((modifier) => modifier.modifierItemId === option.id);

        if (alreadySelected) {
            setSelectedModifiers(selectedModifiers.filter((modifier) => modifier.modifierItemId !== option.id));
            return;
        }

        const nextModifier: SelectedModifier = {
            modifierItemId: option.id,
            name: option.name,
            priceDelta: option.priceDelta,
            quantity: 1,
            groupId,
            groupName,
        };

        if (!allowMultiple) {
            setSelectedModifiers([
                ...selectedModifiers.filter((modifier) => modifier.groupId !== groupId),
                nextModifier,
            ]);
            return;
        }

        setSelectedModifiers([...selectedModifiers, nextModifier]);
    };

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[rgba(26,16,10,0.72)] p-4 backdrop-blur-xl animate-fadeIn">
            <div className="ui-page w-full max-w-xl overflow-hidden rounded-[2.5rem] border border-[var(--color-border)] shadow-2xl flex max-h-[92vh] flex-col relative md:rounded-[3.5rem]">
                {isSyncing && (
                    <div className="absolute inset-0 z-[130] flex items-center justify-center rounded-[2.5rem] bg-white/40 backdrop-blur-[2px] md:rounded-[3.5rem]">
                        <div className="h-16 w-16 rounded-full border-8 border-[var(--color-text)] border-t-[var(--color-brand)] animate-spin"></div>
                    </div>
                )}
                <div className="relative h-40 md:h-80 flex-shrink-0 overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} loading="lazy" decoding="async" fetchPriority="low" width={576} height={320} />
                    <button
                        disabled={isSyncing}
                        onClick={onClose}
                        className="ui-btn-secondary absolute right-6 top-6 z-30 flex h-12 w-12 items-center justify-center rounded-full font-bold shadow-2xl transition-all"
                    >
                        ✕
                    </button>
                </div>
                <div
                    ref={modalScrollRef}
                    onScroll={onScroll}
                    className="p-6 md:p-12 space-y-6 md:space-y-8 overflow-y-auto no-scrollbar"
                >
                    <div className="text-center">
                        <span className="text-[10px] md:text-[12px] font-black text-[var(--color-brand)] uppercase tracking-[0.3em]">
                            {item.category}
                        </span>
                        <h3 className="mt-1 text-2xl font-black uppercase tracking-tighter text-[var(--color-text)] md:text-5xl">
                            {item.name}
                        </h3>
                        <p className="mt-2 text-lg font-black italic text-[var(--color-text)] md:text-2xl">
                            ₡{total.toLocaleString()}
                        </p>
                        {item.description && (
                            <p className="mx-auto mt-3 max-w-lg px-4 text-sm font-medium leading-relaxed text-[var(--color-text-muted)] md:text-base">
                                {item.description}
                            </p>
                        )}

                        {isDietaryGuardianEnabled && isActive ? (
                            <div className="mx-auto mt-4 max-w-lg px-4">
                                {loadingMap[item.id] ? (
                                    <div className="ui-panel-soft flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold italic ui-text-muted">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Analizando ingredientes...</span>
                                    </div>
                                ) : resultsMap[item.id] ? (
                                    <div className={`flex items-start gap-2 rounded-2xl px-3 py-3 text-[11px] font-bold shadow-sm ${resultsMap[item.id].is_safe ? 'ui-state-success shadow-emerald-500/5' : 'ui-state-danger shadow-red-500/5'}`}>
                                        {resultsMap[item.id].is_safe ? (
                                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                        ) : (
                                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                                        )}
                                        <span className="flex-1 break-words leading-relaxed">{resultsMap[item.id].reason}</span>
                                    </div>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    {Array.isArray(item.variants) && item.variants.length > 0 ? (
                        <section className="space-y-3">
                            <p className="ml-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Tamaño o variante</p>
                            <div className="space-y-2">
                                {item.variants.map((variant) => {
                                    const active = selectedVariantId === variant.id || (!selectedVariantId && variant.isDefault);
                                    return (
                                        <button
                                            key={variant.id}
                                            type="button"
                                            onClick={() => setSelectedVariantId(variant.id)}
                                            className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)] bg-white'}`}
                                        >
                                            <span className="text-sm font-bold text-[var(--color-text)]">{variant.name}</span>
                                            <span className="text-xs font-black text-[var(--color-brand)]">₡{Number(variant.price).toLocaleString()}</span>
                                        </button>
                                    );
                                })}
                            </div>
                        </section>
                    ) : null}

                    {Array.isArray(item.modifierGroups) && item.modifierGroups.length > 0 ? (
                        <section className="space-y-4">
                            {item.modifierGroups.map((group) => {
                                const groupSelections = selectedModifiers.filter((modifier) => modifier.groupId === group.id);
                                const allowMultiple = (group.maxSelection ?? 1) > 1;

                                return (
                                    <div key={group.id} className="space-y-2 rounded-2xl border border-[var(--color-border)] p-4">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-[var(--color-text)]">{group.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                                    {group.required ? 'Requerido' : 'Opcional'}
                                                    {group.maxSelection ? ` • Máx ${group.maxSelection}` : ''}
                                                </p>
                                            </div>
                                            <span className="text-[10px] font-black text-[var(--color-brand)]">{groupSelections.length} selección(es)</span>
                                        </div>

                                        <div className="space-y-2">
                                            {group.options.map((option) => {
                                                const active = groupSelections.some((modifier) => modifier.modifierItemId === option.id);
                                                return (
                                                    <button
                                                        key={option.id}
                                                        type="button"
                                                        disabled={!option.available}
                                                        onClick={() => toggleModifier(group.id, group.name, option, allowMultiple)}
                                                        className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition-colors ${active ? 'border-[var(--color-brand)] bg-[var(--color-brand-soft)]' : 'border-[var(--color-border)] bg-white'} ${!option.available ? 'opacity-40' : ''}`}
                                                    >
                                                        <div>
                                                            <p className="text-sm font-bold text-[var(--color-text)]">{option.name}</p>
                                                            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
                                                                {allowMultiple ? 'Selección múltiple' : 'Selección única'}
                                                            </p>
                                                        </div>
                                                        <span className="text-xs font-black text-[var(--color-brand)]">
                                                            {option.priceDelta > 0 ? `+₡${option.priceDelta.toLocaleString()}` : 'Incluido'}
                                                        </span>
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </section>
                    ) : null}

                    <div className="flex items-center justify-center gap-8 border-y border-[var(--color-border)] py-4">
                        <button
                            disabled={isSyncing}
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="ui-btn-secondary flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl font-black"
                        >
                            −
                        </button>
                        <span className="text-3xl font-black min-w-[3rem] text-center">{quantity}</span>
                        <button
                            disabled={isSyncing}
                            onClick={() => setQuantity(quantity + 1)}
                            className="ui-btn-secondary flex h-12 w-12 items-center justify-center rounded-full border-2 text-2xl font-black"
                        >
                            +
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="ml-2 text-[8px] font-black uppercase tracking-widest text-[var(--color-text-muted)]">Personalización</label>
                        <textarea
                            disabled={isSyncing}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Sin cebolla..."
                            className="ui-textarea h-20 w-full rounded-2xl px-5 py-4 text-xs font-bold shadow-inner resize-none"
                        />
                    </div>
                    {errorMessage ? (
                        <p className="rounded-2xl border border-[var(--color-brand)] bg-[var(--color-brand-soft)] px-4 py-3 text-xs font-bold text-[var(--color-brand-strong)]">
                            {errorMessage}
                        </p>
                    ) : null}
                    <button
                        disabled={isSyncing}
                        onClick={onConfirm}
                        className="ui-btn-primary w-full rounded-2xl py-4 text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl active:scale-95"
                    >
                        Añadir por ₡{total.toLocaleString()} 🍱
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;
