"use client";

import React, { useState } from 'react';
import { useLoyaltyStore } from '../store/useLoyaltyStore';
import LoyaltyDashboard from './LoyaltyDashboard';
import { Star } from 'lucide-react';
import { useTranslations } from 'next-intl';

export default function LoyaltyWidget() {
    const t = useTranslations('home.loyalty');
    const { points } = useLoyaltyStore();
    const [isDashboardOpen, setIsDashboardOpen] = useState(false);

    React.useEffect(() => {
        const handleNavigateHome = () => setIsDashboardOpen(false);
        const handleCloseLoyalty = () => setIsDashboardOpen(false);
        window.addEventListener('fast-eat:navigate-home', handleNavigateHome as EventListener);
        window.addEventListener('fast-eat:close-loyalty', handleCloseLoyalty as EventListener);

        return () => {
            window.removeEventListener('fast-eat:navigate-home', handleNavigateHome as EventListener);
            window.removeEventListener('fast-eat:close-loyalty', handleCloseLoyalty as EventListener);
        };
    }, []);

    return (
        <>
            <button
                type="button"
                onClick={() => setIsDashboardOpen(true)}
                className="flex items-center gap-1.5 bg-yellow-50 hover:bg-yellow-100 transition-colors px-3 py-1.5 rounded-full border border-yellow-200 active:scale-95 shadow-sm"
                aria-label={t('aria')}
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
