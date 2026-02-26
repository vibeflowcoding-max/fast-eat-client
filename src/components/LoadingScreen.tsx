"use client";

import React from 'react';
import { useTranslations } from 'next-intl';

interface LoadingScreenProps {
    restaurantName?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ restaurantName }) => {
    const t = useTranslations('checkout');

    return (
        <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center">
            <div className="text-red-600 text-7xl animate-pulse mb-6">禅</div>
            <p className="text-gray-900 font-black tracking-widest animate-pulse uppercase text-xs">
                {t('loadingMenu', { restaurantName: restaurantName || t('defaultMenuName') })}
            </p>
        </div>
    );
};

export default LoadingScreen;
