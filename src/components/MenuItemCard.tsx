
import React, { useState, useEffect } from 'react';
import { MenuItem, CartItem } from '../types';
import { useCartStore } from '../store';

interface MenuItemCardProps {
  item: MenuItem;
  onAddToCart: (cartItem: CartItem) => Promise<boolean>;
  currentQuantity: number;
  isHighlighted?: boolean;
}

const MenuItemCard: React.FC<MenuItemCardProps> = ({ item, onAddToCart, currentQuantity, isHighlighted }) => {
  const [quantity, setQuantity] = useState(currentQuantity > 0 ? currentQuantity : 1);
  const [notes, setNotes] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdding && currentQuantity > 0) {
      setQuantity(currentQuantity);
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
    <div 
      id={`item-${item.id}`}
      className={`
        bg-white rounded-[2rem] md:rounded-[3rem] overflow-hidden shadow-[0_10px_30px_rgba(0,0,0,0.04)] transition-all duration-500 
        hover:shadow-[0_25px_60px_rgba(0,0,0,0.1)] hover:-translate-y-2 border-2 flex flex-col h-full group relative
        ${isHighlighted ? 'border-red-600 ring-4 ring-red-600/20 scale-105 z-10' : 'border-gray-100'}
      `}
    >
      
      {currentQuantity > 0 && !isAdding && (
        <div className="absolute top-3 left-3 md:top-4 md:left-4 z-20 bg-black text-white px-3 py-1.5 md:px-4 md:py-2 rounded-xl md:rounded-2xl shadow-2xl animate-bounce flex items-center gap-1.5 md:gap-2 border border-white/20">
          <span className="text-[8px] md:text-[10px] font-black tracking-widest uppercase">Orden:</span>
          <span className="text-xs md:text-sm font-black text-red-500">{currentQuantity}</span>
        </div>
      )}

      {isHighlighted && (
        <div className="absolute top-3 right-3 md:top-4 md:right-4 z-20 bg-red-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest animate-pulse">
          ✨ ¡Recomendado!
        </div>
      )}

      <div className="relative h-44 md:h-72 overflow-hidden">
        <img 
          src={item.image} 
          alt={item.name} 
          className="w-full h-full object-cover transition-transform group-hover:scale-110 duration-1000" 
          onError={(e) => {
            (e.target as HTMLImageElement).src = `https://images.unsplash.com/photo-1579871494447-9811cf80d66c?auto=format&fit=crop&q=80&w=800`;
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-500 flex items-end p-4 md:p-8">
          <p className="text-white text-[10px] md:text-xs font-bold italic opacity-80 leading-relaxed">
            {currentQuantity > 0 ? 'Modifica tu selección' : 'Personaliza tu pedido'}
          </p>
        </div>
        <div className="absolute bottom-3 left-3 md:bottom-6 md:left-6 bg-white/95 backdrop-blur-md px-4 py-1.5 md:px-6 md:py-2 rounded-xl md:rounded-2xl shadow-xl border border-white/50">
          <span className="text-black font-black text-sm md:text-lg tracking-tighter">₡{item.price.toLocaleString()}</span>
        </div>
      </div>
      
      <div className="p-5 md:p-10 flex-grow flex flex-col">
        <h3 className="text-xl md:text-3xl font-black mb-1.5 md:mb-3 text-gray-900 tracking-tighter leading-none uppercase group-hover:text-red-600 transition-colors duration-300 line-clamp-1">
          {item.name}
        </h3>
        <p className="text-gray-400 text-[11px] md:text-sm mb-4 md:mb-8 leading-relaxed flex-grow font-medium line-clamp-2 md:line-clamp-3">
          {item.description}
        </p>
        
        {!isAdding ? (
          <button 
            onClick={() => setIsAdding(true)}
            className={`w-full py-3.5 md:py-5 rounded-xl md:rounded-[2rem] transition-all duration-300 uppercase text-[9px] md:text-[11px] font-black tracking-[0.2em] md:tracking-[0.3em] shadow-lg active:scale-95 ${
              currentQuantity > 0 
              ? 'bg-red-50 text-red-600 border-2 border-red-600 hover:bg-red-600 hover:text-white' 
              : 'bg-gray-900 text-white hover:bg-red-600'
            }`}
          >
            {currentQuantity > 0 ? 'Editar' : 'Añadir'}
          </button>
        ) : (
          <div className="space-y-4 md:space-y-6 animate-fadeIn relative">
            {isSyncing && (
              <div className="absolute inset-0 bg-white/80 z-10 flex items-center justify-center backdrop-blur-[2px] rounded-xl">
                 <div className="w-8 h-8 border-4 border-black border-t-red-600 rounded-full animate-spin"></div>
              </div>
            )}
            
            <div className="flex items-center justify-between gap-2 md:gap-4 bg-gray-50/50 p-1.5 md:p-2 rounded-xl md:rounded-[2rem] border border-gray-100">
              <span className="text-[8px] md:text-[10px] font-black text-gray-400 uppercase tracking-widest pl-3 md:pl-5 hidden sm:block">Cant.</span>
              <div className="flex items-center bg-white rounded-lg md:rounded-[1.5rem] shadow-sm border border-gray-200 overflow-hidden flex-grow sm:flex-grow-0">
                <button disabled={isSyncing} onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center hover:bg-red-50 text-gray-800 hover:text-red-600 font-bold text-xl md:text-2xl transition-all disabled:opacity-30">−</button>
                <div className="w-8 md:w-12 text-center"><span className="font-black text-black text-sm md:text-lg">{quantity}</span></div>
                <button disabled={isSyncing} onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 md:w-14 md:h-14 flex items-center justify-center hover:bg-red-50 text-gray-800 hover:text-red-600 font-bold text-xl md:text-2xl transition-all disabled:opacity-30">+</button>
              </div>
            </div>
            <div className="relative">
              <textarea 
                disabled={isSyncing}
                placeholder="Notas (ej. sin cebolla)..." 
                value={notes} 
                onChange={(e) => setNotes(e.target.value)} 
                rows={1} 
                className="w-full px-4 py-3 md:p-6 text-[11px] md:text-sm border border-gray-100 rounded-xl md:rounded-[2rem] focus:outline-none focus:border-red-500/30 font-bold transition-all bg-gray-50/50 text-gray-900 placeholder:text-gray-400 resize-none shadow-inner disabled:opacity-50" 
              />
            </div>

            {syncError && (
              <p className="text-[9px] font-black text-red-600 uppercase text-center animate-pulse">
                {syncError}
              </p>
            )}

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                <button disabled={isSyncing} onClick={() => { setIsAdding(false); setSyncError(null); }} className="flex-[0.35] py-3.5 md:py-5 text-[8px] md:text-[10px] font-black border border-gray-200 text-gray-400 rounded-lg md:rounded-2xl uppercase tracking-widest hover:text-gray-900 hover:border-gray-900 disabled:opacity-30">Cerrar</button>
                <button disabled={isSyncing} onClick={handleUpdate} className="flex-1 py-3.5 md:py-5 text-[8px] md:text-[10px] font-black bg-red-600 text-white rounded-lg md:rounded-2xl hover:bg-red-700 shadow-lg shadow-red-600/20 uppercase tracking-widest transition-all active:scale-95 disabled:bg-gray-400">
                  {isSyncing ? '...' : 'Confirmar ✓'}
                </button>
              </div>
              {currentQuantity > 0 && (
                <button disabled={isSyncing} onClick={handleRemove} className="w-full py-2 text-[8px] md:text-[9px] font-black text-red-600/50 hover:text-red-600 transition-all uppercase tracking-widest disabled:opacity-20">
                  Quitar del pedido
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MenuItemCard;
