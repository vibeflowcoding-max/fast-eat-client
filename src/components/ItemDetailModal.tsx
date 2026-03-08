/* eslint-disable @next/next/no-img-element */

import React from 'react';
import { Loader2, ShieldAlert, ShieldCheck } from 'lucide-react';
import { Badge, Button, ChoiceCard, FieldMessage, Icon, QuantitySelector, Surface, TextAreaField } from '@/../resources/components';
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
            <Surface className="relative flex max-h-[92vh] w-full max-w-xl flex-col overflow-hidden rounded-[2.5rem] border border-slate-200/80 p-0 shadow-2xl md:rounded-[3.5rem] dark:border-slate-800/80" padding="none" variant="base">
                {isSyncing && (
                    <div className="absolute inset-0 z-[130] flex items-center justify-center rounded-[2.5rem] bg-white/40 backdrop-blur-[2px] md:rounded-[3.5rem]">
                        <div className="h-16 w-16 rounded-full border-8 border-[var(--color-text)] border-t-[var(--color-brand)] animate-spin"></div>
                    </div>
                )}
                <div className="relative h-40 md:h-80 flex-shrink-0 overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} loading="lazy" decoding="async" fetchPriority="low" width={576} height={320} />
                    <Button
                        aria-label="Cerrar"
                        disabled={isSyncing}
                        onClick={onClose}
                        className="absolute right-6 top-6 z-30 shadow-2xl"
                        size="icon"
                        variant="ghost"
                    >
                        <Icon symbol="close" />
                    </Button>
                </div>
                <div
                    ref={modalScrollRef}
                    onScroll={onScroll}
                    className="p-6 md:p-12 space-y-6 md:space-y-8 overflow-y-auto no-scrollbar"
                >
                    <div className="text-center">
                        <Badge className="px-3 py-1.5 text-[10px] md:text-[12px] font-black uppercase tracking-[0.3em]" variant="brand">
                            {item.category}
                        </Badge>
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
                                    <Surface className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold italic text-slate-500 dark:text-slate-400" padding="none" variant="muted">
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        <span>Analizando ingredientes...</span>
                                    </Surface>
                                ) : resultsMap[item.id] ? (
                                    <Surface className={`flex items-start gap-2 rounded-2xl px-3 py-3 text-[11px] font-bold shadow-sm ${resultsMap[item.id].is_safe ? 'text-emerald-700 dark:text-emerald-200' : 'text-red-700 dark:text-red-200'}`} padding="none" variant="raised">
                                        {resultsMap[item.id].is_safe ? (
                                            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                                        ) : (
                                            <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-brand)]" />
                                        )}
                                        <span className="flex-1 break-words leading-relaxed">{resultsMap[item.id].reason}</span>
                                    </Surface>
                                ) : null}
                            </div>
                        ) : null}
                    </div>
                    {Array.isArray(item.variants) && item.variants.length > 0 ? (
                        <section className="space-y-3">
                            <p className="ml-2 text-[8px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tamaño o variante</p>
                            <div className="space-y-2">
                                {item.variants.map((variant) => {
                                    const active = selectedVariantId === variant.id || (!selectedVariantId && variant.isDefault);
                                    return (
                                        <ChoiceCard
                                            key={variant.id}
                                            onClick={() => setSelectedVariantId(variant.id)}
                                            checked={active}
                                            title={variant.name}
                                            trailing={<span className="text-xs font-black text-orange-600 dark:text-orange-300">₡{Number(variant.price).toLocaleString()}</span>}
                                            type="radio"
                                        />
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
                                    <Surface key={group.id} className="space-y-2 rounded-2xl border border-slate-200/80 dark:border-slate-800/80" variant="muted">
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="text-sm font-black text-[var(--color-text)]">{group.name}</p>
                                                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500 dark:text-slate-400">
                                                    {group.required ? 'Requerido' : 'Opcional'}
                                                    {group.maxSelection ? ` • Máx ${group.maxSelection}` : ''}
                                                </p>
                                            </div>
                                            <Badge variant="brand">{groupSelections.length} selección(es)</Badge>
                                        </div>

                                        <div className="space-y-2">
                                            {group.options.map((option) => {
                                                const active = groupSelections.some((modifier) => modifier.modifierItemId === option.id);
                                                return (
                                                    <ChoiceCard
                                                        key={option.id}
                                                        disabled={!option.available}
                                                        onClick={() => toggleModifier(group.id, group.name, option, allowMultiple)}
                                                        checked={active}
                                                        description={allowMultiple ? 'Selección múltiple' : 'Selección única'}
                                                        title={option.name}
                                                        trailing={<span className="text-xs font-black text-orange-600 dark:text-orange-300">{option.priceDelta > 0 ? `+₡${option.priceDelta.toLocaleString()}` : 'Incluido'}</span>}
                                                        type={allowMultiple ? 'checkbox' : 'radio'}
                                                    />
                                                );
                                            })}
                                        </div>
                                    </Surface>
                                );
                            })}
                        </section>
                    ) : null}

                    <div className="flex items-center justify-center border-y border-slate-200/80 py-4 dark:border-slate-800/80">
                        <QuantitySelector
                            decrementLabel={`Reducir cantidad de ${item.name}`}
                            disabled={isSyncing}
                            incrementLabel={`Aumentar cantidad de ${item.name}`}
                            onDecrement={() => setQuantity(Math.max(1, quantity - 1))}
                            onIncrement={() => setQuantity(quantity + 1)}
                            value={quantity}
                        />
                    </div>
                    <div className="space-y-2">
                        <TextAreaField
                            disabled={isSyncing}
                            label="Personalización"
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Sin cebolla..."
                            rows={4}
                            value={notes}
                        />
                    </div>
                    {errorMessage ? (
                        <FieldMessage tone="error">{errorMessage}</FieldMessage>
                    ) : null}
                    <Button
                        disabled={isSyncing}
                        fullWidth
                        onClick={onConfirm}
                        size="lg"
                        className="text-[11px] font-black uppercase tracking-[0.3em]"
                    >
                        Añadir por ₡{total.toLocaleString()} 🍱
                    </Button>
                </div>
            </Surface>
        </div>
    );
};

export default ItemDetailModal;
