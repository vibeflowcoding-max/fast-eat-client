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
        <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top,#fff4e8_0%,#fdfcf0_48%,#f6efe8_100%)] px-6">
            <div className="relative w-full max-w-sm">
                <div className="absolute inset-x-8 top-8 h-24 rounded-full bg-orange-200/30 blur-3xl" />
                <div className="relative overflow-hidden rounded-[2rem] border border-white/70 bg-white/85 px-8 py-10 text-center shadow-[0_30px_70px_-34px_rgba(146,64,14,0.45)] backdrop-blur">
                    <div className="mx-auto mb-6 flex h-24 w-24 animate-pulse items-center justify-center rounded-[1.75rem] bg-[#fff1e5] shadow-[inset_0_1px_0_rgba(255,255,255,0.85),0_20px_40px_-24px_rgba(217,106,29,0.45)] md:h-28 md:w-28">
                        <Image
                            src="/icons/fasteat-mark-transparent.png"
                            alt="FastEat"
                            width={156}
                            height={156}
                            priority
                            className="h-16 w-16 md:h-20 md:w-20"
                        />
                    </div>

                    <div className="space-y-3">
                        <div className="inline-flex rounded-full border border-orange-100 bg-orange-50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.16em] text-orange-700">
                            FastEat
                        </div>
                        <p className="text-lg font-black tracking-[-0.03em] text-slate-900">
                            {t('loadingMenu', { restaurantName: restaurantName || t('defaultMenuName') })}
                        </p>
                        <div className="flex items-center justify-center gap-2">
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-500 [animation-delay:-0.2s]" />
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-orange-400 [animation-delay:-0.1s]" />
                            <span className="h-2.5 w-2.5 animate-bounce rounded-full bg-amber-400" />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoadingScreen;
