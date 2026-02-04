import React from 'react';
import { CartItem } from '../types';

interface CartItemRowProps {
    item: CartItem;
    isSyncing: boolean;
    onSyncCartAction: (item: CartItem, action: string, newQuantity: number) => void;
}

const CartItemRow: React.FC<CartItemRowProps> = ({ item, isSyncing, onSyncCartAction }) => {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-white p-4 rounded-xl border-2 border-gray-100 gap-4">
            <div className="flex flex-col">
                <span className="font-black text-xs uppercase text-gray-900 line-clamp-1">{item.name}</span>
                <span className="text-[10px] font-bold text-gray-400">₡{item.price.toLocaleString()} c/u</span>
            </div>
            <div className="flex items-center gap-3">
                <div className="flex items-center bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                    <button
                        disabled={isSyncing}
                        onClick={() => onSyncCartAction(item, 'increment', item.quantity - 1)}
                        className="w-8 h-8 flex items-center justify-center font-black"
                    >
                        -
                    </button>
                    <span className="w-8 text-center text-[11px] font-black text-red-600">{item.quantity}</span>
                    <button
                        disabled={isSyncing}
                        onClick={() => onSyncCartAction(item, 'increment', item.quantity + 1)}
                        className="w-8 h-8 flex items-center justify-center font-black"
                    >
                        +
                    </button>
                </div>
                <button
                    disabled={isSyncing}
                    onClick={() => onSyncCartAction(item, 'remove', 0)}
                    className="w-8 h-8 flex items-center justify-center text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default CartItemRow;
