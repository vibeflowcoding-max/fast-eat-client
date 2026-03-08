"use client";

import React from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';

interface LoadingScreenProps {
    restaurantName?: string;
}

const LoadingScreen: React.FC<LoadingScreenProps> = ({ restaurantName }) => {
    const t = useTranslations('checkout');

    return (
        <div className="min-h-screen bg-[#fdfcf0] flex flex-col items-center justify-center">
            <div className="mb-6 animate-pulse">
                <Image
                    src="/icons/fasteat-mark-transparent.png"
                    alt="FastEat"
                    width={156}
                    height={156}
                    priority
                    className="h-28 w-28 md:h-36 md:w-36 drop-shadow-[0_14px_34px_rgba(217,106,29,0.18)]"
                />
            </div>
            <p className="text-gray-900 font-black tracking-widest animate-pulse uppercase text-xs">
                {t('loadingMenu', { restaurantName: restaurantName || t('defaultMenuName') })}
            </p>
        </div>
    );
};

export default LoadingScreen;
