import React from 'react';
import { DeliveryBid } from '@/types';

interface BidRowProps {
  bid: DeliveryBid;
  orderId: string;
  title?: string;
  isLoading: boolean;
  isHighlighted?: boolean;
  onAccept: (orderId: string, bidId: string) => void;
}

const BidRow: React.FC<BidRowProps> = ({ bid, orderId, title, isLoading, isHighlighted = false, onAccept }) => {
  return (
    <div
      id={`bid-${bid.id}`}
      className={`rounded-xl border p-3 bg-white transition-all ${isHighlighted ? 'ring-2 ring-red-500/40 border-red-300' : 'border-gray-200'}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-500">{title || 'Oferta'}</p>
          <p className="text-lg font-black text-gray-900">₡{bid.bidAmount.toLocaleString()}</p>
        </div>
        <button
          type="button"
          disabled={isLoading}
          onClick={() => onAccept(orderId, bid.id)}
          className="px-3 py-2 rounded-lg bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-600 disabled:opacity-60"
        >
          {isLoading ? 'Aceptando...' : 'Aceptar'}
        </button>
      </div>
      <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-2">
        <span>⭐ Rating: {bid.driverRating.toFixed(1)}</span>
        <span>⏱ ETA: {bid.estimatedTimeMinutes ? `${bid.estimatedTimeMinutes} min` : 'N/D'}</span>
      </div>
      {bid.driverNotes && (
        <p className="mt-2 text-[11px] text-gray-700">{bid.driverNotes}</p>
      )}
    </div>
  );
};

export default BidRow;
