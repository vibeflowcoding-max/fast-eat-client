import React from 'react';
import { DeliveryBid } from '@/types';

interface BidRowProps {
  bid: DeliveryBid;
  orderId: string;
  title?: string;
  isLoading: boolean;
  isHighlighted?: boolean;
  onAccept: (orderId: string, bidId: string) => void;
  onCounterOffer: (orderId: string, bidId: string, amount: number) => void;
}

const BidRow: React.FC<BidRowProps> = ({ bid, orderId, title, isLoading, isHighlighted = false, onAccept, onCounterOffer }) => {
  const [showCounter, setShowCounter] = React.useState(false);
  const [counterAmount, setCounterAmount] = React.useState<number>(Math.round(bid.bidAmount * 0.8));

  const isCountered = bid.status === 'countered';

  return (
    <div
      id={`bid-${bid.id}`}
      className={`rounded-xl border p-4 bg-white transition-all shadow-sm ${isHighlighted ? 'ring-2 ring-red-500/40 border-red-300 bg-red-50/10' : 'border-gray-200 hover:border-gray-300'}`}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title || 'Oferta'}</p>
            {isCountered && (
              <span className="bg-orange-100 text-orange-700 text-[8px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider">Esperando repartidor</span>
            )}
          </div>
          <p className="text-xl font-black text-gray-900 leading-tight">₡{bid.bidAmount.toLocaleString()}</p>
          {isCountered && bid.basePrice && (
            <p className="text-[10px] text-gray-400 font-bold italic mt-0.5">Tú propusiste: ₡{bid.basePrice.toLocaleString()}</p>
          )}
        </div>
        <div className="flex gap-2">
          {!isCountered && (
            <button
              type="button"
              disabled={isLoading}
              onClick={() => setShowCounter(!showCounter)}
              className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-[10px] font-black uppercase tracking-widest hover:bg-gray-200 transition-colors disabled:opacity-60"
            >
              Regatear
            </button>
          )}
          <button
            type="button"
            disabled={isLoading}
            onClick={() => onAccept(orderId, bid.id)}
            className="px-4 py-2 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 transition-all shadow-lg active:scale-95 disabled:opacity-60"
          >
            {isLoading ? 'Aceptando...' : 'Aceptar'}
          </button>
        </div>
      </div>

      {showCounter && !isCountered && (
        <div className="mb-4 p-3 bg-gray-50 rounded-xl border border-gray-100 animate-slideDown">
          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Tu Contraoferta</p>
          <div className="flex gap-2">
            <input
              type="number"
              value={counterAmount}
              onChange={(e) => setCounterAmount(Number(e.target.value))}
              className="flex-grow bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-red-500/20 focus:border-red-500 outline-none"
              placeholder="Monto..."
            />
            <button
              onClick={() => {
                onCounterOffer(orderId, bid.id, counterAmount);
                setShowCounter(false);
              }}
              disabled={isLoading || !counterAmount || counterAmount <= 0}
              className="bg-red-600 text-white px-4 py-2 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition-colors shadow-md disabled:opacity-50"
            >
              Enviar
            </button>
          </div>
        </div>
      )}

      <div className="text-[10px] font-bold text-gray-500 grid grid-cols-2 gap-x-4 gap-y-1">
        <div className="flex items-center gap-1">
          <span className="text-sm">⭐</span>
          <span>Rating: {bid.driverRating.toFixed(1)}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-sm">⏱</span>
          <span>Llega en: {bid.estimatedTimeMinutes ? `${bid.estimatedTimeMinutes} min` : 'N/D'}</span>
        </div>
      </div>

      {bid.driverNotes && (
        <div className="mt-3 p-2 bg-gray-50/50 rounded-lg border-l-2 border-gray-200">
          <p className="text-[11px] font-medium text-gray-700 leading-relaxed italic">"{bid.driverNotes}"</p>
        </div>
      )}
    </div>
  );
};

export default BidRow;
