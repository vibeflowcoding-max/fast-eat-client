import React from 'react';
import { MenuItem } from '../types';

interface ItemDetailModalProps {
    item: MenuItem;
    quantity: number;
    setQuantity: (q: number) => void;
    notes: string;
    setNotes: (n: string) => void;
    onClose: () => void;
    onConfirm: () => void;
    isSyncing: boolean;
    modalScrollRef: React.RefObject<HTMLDivElement | null>;
    onScroll: () => void;
}

const ItemDetailModal: React.FC<ItemDetailModalProps> = ({
    item,
    quantity,
    setQuantity,
    notes,
    setNotes,
    onClose,
    onConfirm,
    isSyncing,
    modalScrollRef,
    onScroll,
}) => {
    return (
        <div className="fixed inset-0 bg-black/95 z-[120] flex items-center justify-center p-4 backdrop-blur-2xl animate-fadeIn">
            <div className="bg-[#fdfcf0] w-full max-w-xl rounded-[2.5rem] md:rounded-[3.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[92vh] border border-white/20 relative">
                {isSyncing && (
                    <div className="absolute inset-0 bg-white/40 backdrop-blur-[2px] z-[130] flex items-center justify-center rounded-[2.5rem] md:rounded-[3.5rem]">
                        <div className="w-16 h-16 border-8 border-black border-t-red-600 rounded-full animate-spin"></div>
                    </div>
                )}
                <div className="relative h-40 md:h-80 flex-shrink-0 overflow-hidden">
                    <img src={item.image} className="w-full h-full object-cover" alt={item.name} />
                    <button
                        disabled={isSyncing}
                        onClick={onClose}
                        className="absolute top-6 right-6 w-12 h-12 bg-white text-black rounded-full flex items-center justify-center shadow-2xl hover:bg-red-600 hover:text-white transition-all z-30 font-bold"
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
                        <span className="text-[10px] md:text-[12px] font-black text-red-600 uppercase tracking-[0.3em]">
                            {item.category}
                        </span>
                        <h3 className="text-2xl md:text-5xl font-black text-gray-900 uppercase tracking-tighter mt-1">
                            {item.name}
                        </h3>
                        <p className="text-lg md:text-2xl text-gray-900 font-black italic mt-2">
                            ₡{item.price.toLocaleString()}
                        </p>
                        {item.description && (
                            <p className="text-sm md:text-base text-gray-600 font-medium mt-3 px-4 leading-relaxed max-w-lg mx-auto">
                                {item.description}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center justify-center gap-8 py-4 border-y border-gray-200">
                        <button
                            disabled={isSyncing}
                            onClick={() => setQuantity(Math.max(1, quantity - 1))}
                            className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-2xl font-black"
                        >
                            −
                        </button>
                        <span className="text-3xl font-black min-w-[3rem] text-center">{quantity}</span>
                        <button
                            disabled={isSyncing}
                            onClick={() => setQuantity(quantity + 1)}
                            className="w-12 h-12 rounded-full border-2 border-black flex items-center justify-center text-2xl font-black"
                        >
                            +
                        </button>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[8px] font-black uppercase tracking-widest text-gray-500 ml-2">Personalización</label>
                        <textarea
                            disabled={isSyncing}
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Ej: Sin cebolla..."
                            className="w-full px-5 py-4 bg-white border-2 border-gray-100 rounded-2xl text-xs font-bold text-gray-900 focus:outline-none focus:border-red-600 resize-none h-20 shadow-inner"
                        />
                    </div>
                    <button
                        disabled={isSyncing}
                        onClick={onConfirm}
                        className="w-full py-4 bg-black text-white rounded-2xl font-black uppercase tracking-[0.3em] text-[11px] hover:bg-red-600 transition-all shadow-2xl active:scale-95"
                    >
                        Añadir al Pedido 🍱
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ItemDetailModal;
