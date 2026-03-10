import React from 'react';
import { useTranslations } from 'next-intl';
import { CartItem } from '../types';
import { Button, Icon, QuantitySelector, Surface } from '@/../resources/components';

interface CartItemRowProps {
    item: CartItem;
    isSyncing: boolean;
    onSyncCartAction: (item: CartItem, action: string, newQuantity: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, isSyncing, onSyncCartAction }) => {
    const t = useTranslations('cartItemRow');

    return (
        <Surface className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" variant="base">
            <div className="min-w-0 space-y-1">
                <span className="line-clamp-1 text-xs font-black uppercase text-slate-900 dark:text-slate-100">{item.name}</span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">{t('unitPrice', { price: item.price.toLocaleString() })}</span>
            </div>

            <div className="flex items-center gap-3">
                <QuantitySelector
                    decrementLabel={t('decrementQuantity', { itemName: item.name })}
                    disabled={isSyncing}
                    incrementLabel={t('incrementQuantity', { itemName: item.name })}
                    onDecrement={() => onSyncCartAction(item, 'increment', item.quantity - 1)}
                    onIncrement={() => onSyncCartAction(item, 'increment', item.quantity + 1)}
                    value={item.quantity}
                />
                <Button
                    aria-label={t('removeItem', { itemName: item.name })}
                    disabled={isSyncing}
                    onClick={() => onSyncCartAction(item, 'remove', 0)}
                    size="icon"
                    variant="ghost"
                >
                    <Icon symbol="delete" tone="danger" />
                </Button>
            </div>
        </Surface>
    );
};

export default CartItemRow;
