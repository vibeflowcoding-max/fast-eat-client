"use client";

import React, { useState } from 'react';
import { useLoyaltyStore } from '../store/useLoyaltyStore';
import LoyaltyDashboard from './LoyaltyDashboard';
import { Star } from 'lucide-react';

export default function LoyaltyWidget() {
    const { points } = useLoyaltyStore();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);

    return (
        <>
            <button
                onClick={() => setIsDashboardOpen(true)}
                className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 transition-colors px-3 py-1.5 rounded-full border border-yellow-200 active:scale-95 shadow-sm"
                aria-label="Ver mi lealtad y puntos"
            >
                <Star className="w-4 h-4 text-orange-500 fill-current" />
                <span className="text-xs font-black text-orange-700">{points.toLocaleString()} <span className="text-[10px] font-bold">pts</span></span>
            </button>

            {isDashboardOpen && (
                <LoyaltyDashboard onClose={() => setIsDashboardOpen(false)} />
            )}
        </>
    );
}
