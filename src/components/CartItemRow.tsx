import React from 'react';
import { CartItem } from '../types';
import { Button, Icon, QuantitySelector, Surface } from '@/../resources/components';

interface CartItemRowProps {
    item: CartItem;
    isSyncing: boolean;
    onSyncCartAction: (item: CartItem, action: string, newQuantity: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, isSyncing, onSyncCartAction }) => {
    return (
        <Surface className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between" variant="base">
            <div className="min-w-0 space-y-1">
                <span className="line-clamp-1 text-xs font-black uppercase text-slate-900 dark:text-slate-100">{item.name}</span>
                <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500">₡{item.price.toLocaleString()} c/u</span>
            </div>

            <div className="flex items-center gap-3">
                <QuantitySelector
                    decrementLabel={`Reducir cantidad de ${item.name}`}
                    disabled={isSyncing}
                    incrementLabel={`Aumentar cantidad de ${item.name}`}
                    onDecrement={() => onSyncCartAction(item, 'increment', item.quantity - 1)}
                    onIncrement={() => onSyncCartAction(item, 'increment', item.quantity + 1)}
                    value={item.quantity}
                />
                <Button
                    aria-label={`Quitar ${item.name}`}
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
