"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RestaurantInfo } from '../types';
import SearchBar from './SearchBar';
import { useCartStore } from '@/store';
import { Package, ShoppingCart, Heart, Star, ArrowLeft } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { audioManager } from '@/lib/audio';
import { Button, Surface } from '@/../resources/components';
import { cn } from '@/../resources/components/utils';
import NotificationTrayTrigger from './NotificationTrayTrigger';

interface NavbarProps {
    restaurantInfo: RestaurantInfo | null;
    isTestMode: boolean;
    toggleTestMode: () => void;
    onShowHistory: () => void;
    onOpenCart: () => void;
    totalItemsCount: number;
    cartLength: number;
    categories: string[];
    activeCategory: string;
    setActiveCategory: (cat: string) => void;
    tabsRef: React.RefObject<HTMLDivElement | null>;
    canScrollLeft: boolean;
    canScrollRight: boolean;
    scrollTabs: (direction: 'left' | 'right') => void;
    onScroll: () => void;
    isLoading?: boolean;
    onOpenReviews: () => void;
    onGoBack: () => void;
    customerName: string;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
    restaurantInfo,
    isTestMode: _isTestMode,
    toggleTestMode: _toggleTestMode,
    onShowHistory,
    onOpenCart,
    totalItemsCount,
    cartLength,
    categories,
    activeCategory,
    setActiveCategory,
    tabsRef,
    canScrollLeft,
    canScrollRight,
    scrollTabs,
    onScroll,
    isLoading,
    onOpenReviews,
    onGoBack,
    customerName: _customerName,
    searchQuery,
    setSearchQuery,
}) => {
    const [isFavorite, setIsFavorite] = useState(false);
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
    const t = useTranslations('nav');
    const clientContext = useCartStore((state) => state.clientContext);
    const hydrateClientContext = useCartStore((state) => state.hydrateClientContext);

    const ratingLabel =
        typeof restaurantInfo?.rating === 'number' && restaurantInfo.rating > 0
            ? restaurantInfo.rating.toFixed(1)
            : t('ratingNotAvailable');

    const resolveAccessToken = async () => {
        const { data } = await supabase.auth.getSession();
        return data.session?.access_token || null;
    };

    React.useEffect(() => {
        let mounted = true;
        const cachedFavorites = Array.isArray(clientContext?.favorites) ? clientContext.favorites : [];
        const hasCachedFavorite = Boolean(restaurantInfo?.id) && cachedFavorites.includes(String(restaurantInfo.id));

        if (hasCachedFavorite) {
            setIsFavorite(true);
        }

        async function loadFavoriteState() {
            if (!restaurantInfo?.id) {
                if (mounted) {
                    setIsFavorite(false);
                }
                return;
            }

            try {
                const token = await resolveAccessToken();
                if (!token) {
                    if (mounted) {
                        setIsFavorite(false);
                    }
                    return;
                }

                const response = await fetch(`/api/favorites?restaurantId=${encodeURIComponent(restaurantInfo.id)}`, {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    return;
                }

                const payload = await response.json();
                if (mounted) {
                    if (Array.isArray(payload?.favoriteRestaurantIds)) {
                        hydrateClientContext({ favorites: payload.favoriteRestaurantIds.map(String) });
                        setIsFavorite(payload.favoriteRestaurantIds.map(String).includes(restaurantInfo.id));
                    } else {
                        setIsFavorite(Boolean(payload?.isFavorite));
                    }
                }
            } catch {
                if (mounted) {
                    setIsFavorite(false);
                }
            }
        }

        if (!restaurantInfo?.id || !hasCachedFavorite) {
            loadFavoriteState();
        }

        return () => {
            mounted = false;
        };
    }, [clientContext?.favorites, hydrateClientContext, restaurantInfo?.id]);

    useEffect(() => {
        const unlock = () => {
            void audioManager.unlock();
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };

        window.addEventListener('pointerdown', unlock, { passive: true, once: true });
        window.addEventListener('keydown', unlock, { once: true });
        window.addEventListener('touchstart', unlock, { passive: true, once: true });

        return () => {
            window.removeEventListener('pointerdown', unlock);
            window.removeEventListener('keydown', unlock);
            window.removeEventListener('touchstart', unlock);
        };
    }, []);

    const handleToggleFavorite = async () => {
        if (!restaurantInfo?.id || isFavoriteLoading) {
            return;
        }

        const token = await resolveAccessToken();
        if (!token) {
            return;
        }

        const optimisticValue = !isFavorite;
        setIsFavorite(optimisticValue);
        setIsFavoriteLoading(true);
        const previousFavorites = Array.isArray(clientContext?.favorites) ? clientContext.favorites : [];
        const nextFavorites = optimisticValue
            ? Array.from(new Set([...previousFavorites, restaurantInfo.id]))
            : previousFavorites.filter((entry) => entry !== restaurantInfo.id);
        hydrateClientContext({ favorites: nextFavorites });

        try {
            if (optimisticValue) {
                const response = await fetch('/api/favorites', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`
                    },
                    body: JSON.stringify({ restaurantId: restaurantInfo.id })
                });

                if (!response.ok) {
                    throw new Error(t('favoriteError'));
                }
            } else {
                const response = await fetch(`/api/favorites?restaurantId=${encodeURIComponent(restaurantInfo.id)}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error(t('unfavoriteError'));
                }
            }
        } catch {
            setIsFavorite(!optimisticValue);
            hydrateClientContext({ favorites: previousFavorites });
        } finally {
            setIsFavoriteLoading(false);
        }
    };

    return (
        <div
            data-menu-sticky-nav="true"
            className="sticky top-0 z-50 border-b border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.92)_0%,rgba(252,246,239,0.96)_100%)] shadow-[0_20px_48px_-32px_rgba(98,60,29,0.35)] backdrop-blur-xl"
        >
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col">
                <div className="flex items-center justify-between py-3 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4 overflow-visible no-scrollbar scroll-smooth flex-nowrap pr-4 -mr-4 md:pr-0 md:mr-0">
                        <Button
                            onClick={onGoBack}
                            className="h-10 w-10 shrink-0 rounded-full md:h-11 md:w-11"
                            aria-label={t('back')}
                            size="icon"
                            variant="outline"
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </Button>
                        <Button
                            onClick={onShowHistory}
                            className="h-10 w-10 shrink-0 rounded-full md:h-11 md:w-11"
                            aria-label={t('trackOrders')}
                            size="icon"
                            variant="outline"
                        >
                            <Package className="w-5 h-5" strokeWidth={2.5} />
                        </Button>
                        <NotificationTrayTrigger
                            analyticsSource="navbar_button"
                            className="relative shrink-0"
                            buttonClassName="relative h-10 w-10 rounded-full md:h-11 md:w-11"
                            badgeClassName="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[10px] font-bold text-white shadow-sm dark:border-slate-900"
                            iconClassName="w-5 h-5"
                            onOpenTracking={onShowHistory}
                        />
                        <div className="relative shrink-0">
                            <Button
                                onClick={onOpenReviews}
                                className="h-10 shrink-0 rounded-full px-3 md:h-11"
                                aria-label={t('openRestaurantReviews')}
                                size="sm"
                                variant="outline"
                            >
                                <Star className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
                                <span className="text-xs font-black">{ratingLabel}</span>
                            </Button>
                        </div>
                        <Button
                            onClick={handleToggleFavorite}
                            disabled={isFavoriteLoading || !restaurantInfo?.id}
                            className={cn(
                                'h-10 w-10 shrink-0 rounded-full md:h-11 md:w-11',
                                isFavorite
                                    ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300 dark:hover:bg-rose-500/20'
                                    : '',
                            )}
                            aria-label={isFavorite ? t('removeFavoriteRestaurant') : t('addFavoriteRestaurant')}
                            size="icon"
                            variant="outline"
                        >
                            <Heart className="w-5 h-5" strokeWidth={2.5} fill={isFavorite ? 'currentColor' : 'none'} />
                        </Button>
                    </div>

                    <div className="hidden md:flex flex-grow justify-center px-8">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    </div>

                    <Button
                        onClick={onOpenCart}
                        className={cn(
                            'relative ml-4 h-12 w-12 shrink-0 rounded-full shadow-sm md:ml-0 md:h-14 md:w-14',
                            cartLength > 0 ? 'shadow-lg hover:scale-105 active:scale-95' : '',
                        )}
                        aria-label={t('myOrder')}
                        size="icon"
                        variant={cartLength > 0 ? 'primary' : 'outline'}
                    >
                        <ShoppingCart className="w-6 h-6" strokeWidth={2.5} fill={cartLength > 0 ? 'currentColor' : 'none'} />
                        {totalItemsCount > 0 && (
                            <span className="absolute -right-1 -top-1 flex h-[22px] min-w-[22px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[11px] font-bold text-white shadow-sm dark:border-slate-900">
                                {totalItemsCount}
                            </span>
                        )}
                    </Button>
                </div>

                {/* Mobile Search Bar Row */}
                <div className="md:hidden pb-3 px-1">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                <div className="relative group">
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 flex items-center">
                            <button onClick={() => scrollTabs('left')} className="p-1 text-[var(--color-brand)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" />
                                </svg>
                            </button>
                        </div>
                    )}
                    <div
                        ref={tabsRef}
                        onScroll={onScroll}
                        className="flex items-center overflow-x-auto py-3 md:py-6 gap-2 md:gap-4 no-scrollbar scroll-smooth px-2 md:px-0"
                    >
                        {(isLoading || categories.length === 0) ? (
                            Array.from({ length: 4 }).map((_, i) => (
                                <div
                                    key={`cat-skeleton-${i}`}
                                    data-testid="category-skeleton"
                                    className="px-8 md:px-14 py-4 md:py-6 rounded-xl bg-gray-200 border-2 border-transparent flex-shrink-0 animate-pulse relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                                </div>
                            ))
                        ) : (
                            categories.map(cat => (
                                <button
                                    key={cat}
                                    data-cat={cat}
                                    onClick={() => setActiveCategory(cat)}
                                    aria-current={activeCategory === cat ? 'page' : undefined}
                                    className={cn(
                                        'flex-shrink-0 rounded-xl border-2 px-5 py-2.5 text-[9px] font-black uppercase tracking-widest transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 focus-visible:ring-offset-2 md:px-10 md:py-4 md:text-[11px]',
                                        activeCategory === cat
                                            ? 'border-transparent bg-[linear-gradient(135deg,#ec5b13_0%,#fb923c_100%)] text-white shadow-[0_14px_28px_-18px_rgba(236,91,19,0.8)] scale-105 hover:bg-[linear-gradient(135deg,#c9480f_0%,#f97316_100%)]'
                                            : 'border-slate-200 bg-[#fcf7f1] text-slate-500 hover:bg-[#fdf8f3] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400 dark:hover:bg-slate-800',
                                    )}
                                >
                                    {cat}
                                </button>
                            ))
                        )}
                    </div>
                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-l from-white to-transparent z-10 flex items-center justify-end">
                            <button onClick={() => scrollTabs('right')} className="p-1 text-[var(--color-brand)]">
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" />
                                </svg>
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Navbar;
