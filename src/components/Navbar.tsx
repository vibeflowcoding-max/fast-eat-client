"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { RestaurantInfo } from '../types';
import SearchBar from './SearchBar';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';
import { Package, ShoppingCart, Zap, Heart, Star, ArrowLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { audioManager } from '@/lib/audio';
import { BidNotification } from '@/types';

type OrderStatusCue = {
    orderId: string;
    statusCode: string;
    statusLabel: string;
    description: string;
};

const STATUS_CUE_DESCRIPTION_KEY_BY_CODE: Record<string, string> = {
    PENDING: 'statusCueDescriptions.pending',
    CONFIRMED: 'statusCueDescriptions.confirmed',
    AUCTION_ACTIVE: 'statusCueDescriptions.auctionActive',
    DRIVER_ASSIGNED: 'statusCueDescriptions.driverAssigned',
    PREPARING: 'statusCueDescriptions.preparing',
    READY: 'statusCueDescriptions.ready',
    DELIVERING: 'statusCueDescriptions.delivering',
    DELIVERED: 'statusCueDescriptions.delivered',
    COMPLETED: 'statusCueDescriptions.completed',
    PICKED_UP: 'statusCueDescriptions.pickedUp',
    CANCELLED: 'statusCueDescriptions.cancelled',
    REFUNDED: 'statusCueDescriptions.refunded',
};

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
    isTestMode,
    toggleTestMode,
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
    customerName,
    searchQuery,
    setSearchQuery,
}) => {
    const [isTrayOpen, setIsTrayOpen] = useState(false);
    const [isFavorite, setIsFavorite] = useState(false);
    const [isFavoriteLoading, setIsFavoriteLoading] = useState(false);
    const [activeCue, setActiveCue] = useState<BidNotification | null>(null);
    const [activeStatusCue, setActiveStatusCue] = useState<OrderStatusCue | null>(null);
    const cueTimeoutRef = useRef<number | null>(null);
    const statusCueTimeoutRef = useRef<number | null>(null);
    const lastUnreadIdRef = useRef<string | null>(null);
    const t = useTranslations('nav');
    const tTracking = useTranslations('tracking');
    const bidNotifications = useCartStore((state) => state.bidNotifications);
    const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
    const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);
    const unreadNotifications = useMemo(
        () => bidNotifications.filter((notification) => !notification.read),
        [bidNotifications]
    );
    const unreadCount = unreadNotifications.length;

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
                    setIsFavorite(Boolean(payload?.isFavorite));
                }
            } catch {
                if (mounted) {
                    setIsFavorite(false);
                }
            }
        }

        loadFavoriteState();

        return () => {
            mounted = false;
        };
    }, [restaurantInfo?.id]);

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

    useEffect(() => {
        const latestUnread = unreadNotifications[0] ?? null;

        if (!latestUnread) {
            setActiveCue(null);
            lastUnreadIdRef.current = null;
            return;
        }

        if (latestUnread.id === lastUnreadIdRef.current) {
            return;
        }

        lastUnreadIdRef.current = latestUnread.id;
        setActiveCue(latestUnread);

        if (cueTimeoutRef.current) {
            window.clearTimeout(cueTimeoutRef.current);
        }

        cueTimeoutRef.current = window.setTimeout(() => {
            setActiveCue(null);
        }, 7000);

        return () => {
            if (cueTimeoutRef.current) {
                window.clearTimeout(cueTimeoutRef.current);
            }
        };
    }, [unreadNotifications]);

    useEffect(() => {
        const handleStatusChanged = (event: Event) => {
            const customEvent = event as CustomEvent<{
                orderId?: string;
                statusCode?: string;
                statusLabel?: string;
                description?: string | null;
            }>;

            const orderId = String(customEvent.detail?.orderId || '').trim();
            if (!orderId) {
                return;
            }

            const statusCode = String(customEvent.detail?.statusCode || '').trim();
            const normalizedStatusCode = statusCode.toUpperCase();
            const statusLabel = String(customEvent.detail?.statusLabel || 'Estado actualizado').trim();
            const descriptionFromDb = String(customEvent.detail?.description || '').trim();
            const translationKey = STATUS_CUE_DESCRIPTION_KEY_BY_CODE[normalizedStatusCode];
            const localizedDescription = translationKey ? tTracking(translationKey) : '';
            const description = localizedDescription || descriptionFromDb || statusLabel;

            setActiveStatusCue({
                orderId,
                statusCode: normalizedStatusCode,
                statusLabel,
                description,
            });

            if (statusCueTimeoutRef.current) {
                window.clearTimeout(statusCueTimeoutRef.current);
            }

            statusCueTimeoutRef.current = window.setTimeout(() => {
                setActiveStatusCue(null);
            }, 8000);
        };

        window.addEventListener('fast-eat:order_status_changed', handleStatusChanged as EventListener);

        return () => {
            window.removeEventListener('fast-eat:order_status_changed', handleStatusChanged as EventListener);
            if (statusCueTimeoutRef.current) {
                window.clearTimeout(statusCueTimeoutRef.current);
            }
        };
    }, [tTracking]);

    const openFromCue = (notification: BidNotification) => {
        markBidNotificationRead(notification.id);
        setDeepLinkTarget({ orderId: notification.orderId, bidId: notification.id });
        setActiveCue(null);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fast-eat:bid_notification_click', {
                detail: {
                    orderId: notification.orderId,
                    bidId: notification.id,
                    source: 'navbar_cue'
                }
            }));
            window.dispatchEvent(new CustomEvent('fast-eat:bid_notification_conversion', {
                detail: {
                    orderId: notification.orderId,
                    bidId: notification.id,
                    source: 'navbar_cue'
                }
            }));
        }
        onShowHistory();
    };

    const dismissCue = (notification: BidNotification) => {
        markBidNotificationRead(notification.id);
        setActiveCue(null);
        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fast-eat:bid_notification_dismiss', {
                detail: {
                    orderId: notification.orderId,
                    bidId: notification.id,
                    source: 'navbar_cue'
                }
            }));
        }
    };

    const dismissStatusCue = () => {
        if (!activeStatusCue) {
            return;
        }

        if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('fast-eat:order_status_notification_dismiss', {
                detail: {
                    orderId: activeStatusCue.orderId,
                    statusCode: activeStatusCue.statusCode,
                    source: 'navbar_status_cue'
                }
            }));
        }

        setActiveStatusCue(null);
    };

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
                    throw new Error('Could not favorite restaurant');
                }
            } else {
                const response = await fetch(`/api/favorites?restaurantId=${encodeURIComponent(restaurantInfo.id)}`, {
                    method: 'DELETE',
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Could not unfavorite restaurant');
                }
            }
        } catch {
            setIsFavorite(!optimisticValue);
        } finally {
            setIsFavoriteLoading(false);
        }
    };

    return (
        <div className="sticky top-0 ui-panel shadow-2xl z-50 border-b">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col">
                {activeStatusCue && (
                    <div className="pt-3">
                        <div className="ui-panel-soft flex items-center justify-between gap-3 rounded-xl px-3 py-2 border border-blue-200">
                            <button
                                type="button"
                                onClick={() => {
                                    if (typeof window !== 'undefined') {
                                        window.dispatchEvent(new CustomEvent('fast-eat:order_status_notification_click', {
                                            detail: {
                                                orderId: activeStatusCue.orderId,
                                                statusCode: activeStatusCue.statusCode,
                                                source: 'navbar_status_cue'
                                            }
                                        }));
                                    }

                                    onShowHistory();
                                }}
                                className="text-left flex-1"
                                aria-label={t('trackOrders')}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-700">Estado de orden actualizado</p>
                                <p className="text-xs font-semibold text-blue-900">{activeStatusCue.description}</p>
                            </button>
                            <button
                                type="button"
                                onClick={dismissStatusCue}
                                className="ui-btn-secondary rounded-full p-1"
                                aria-label="Dismiss order status notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                {activeCue && (
                    <div className="pt-3">
                        <div className="ui-chip-brand flex items-center justify-between gap-3 rounded-xl px-3 py-2 animate-pulse">
                            <button
                                type="button"
                                onClick={() => openFromCue(activeCue)}
                                className="text-left flex-1"
                                aria-label={t('openOfferNotifications')}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest">Nueva oferta recibida</p>
                                <p className="text-xs font-semibold">Orden #{activeCue.orderId.slice(0, 8)} · ₡{Math.round(activeCue.bid.bidAmount).toLocaleString()}</p>
                            </button>
                            <button
                                type="button"
                                onClick={() => dismissCue(activeCue)}
                                className="ui-btn-secondary rounded-full p-1"
                                aria-label="Dismiss bid notification"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
                <div className="flex items-center justify-between py-3 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4 overflow-visible no-scrollbar scroll-smooth flex-nowrap pr-4 -mr-4 md:pr-0 md:mr-0">
                        <button
                            type="button"
                            onClick={onGoBack}
                            className="ui-btn-secondary flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                            aria-label={t('back')}
                        >
                            <ArrowLeft className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button
                            onClick={onShowHistory}
                            className="ui-btn-secondary flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                            aria-label={t('trackOrders')}
                        >
                            <Package className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                className="ui-btn-secondary relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                                onClick={() => setIsTrayOpen((current) => !current)}
                                aria-label={t('openOfferNotifications')}
                            >
                                <Zap className="w-5 h-5" strokeWidth={2.5} fill="currentColor" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 ui-btn-primary text-[10px] min-w-[18px] h-[18px] rounded-full flex items-center justify-center border-2 border-white font-bold shadow-sm">
                                        {unreadCount}
                                    </span>
                                )}
                            </button>
                            {isTrayOpen && (
                                <div className="absolute top-full mt-2 left-0 z-[120]">
                                    <OrderNotificationsTray
                                        onOpenTracking={() => {
                                            onShowHistory();
                                            setIsTrayOpen(false);
                                        }}
                                    />
                                </div>
                            )}
                        </div>
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={onOpenReviews}
                                className="ui-btn-secondary inline-flex items-center justify-center gap-1 px-3 h-10 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                                aria-label={t('openRestaurantReviews')}
                            >
                                <Star className="w-4 h-4" strokeWidth={2.5} fill="currentColor" />
                                <span className="text-xs font-black">{ratingLabel}</span>
                            </button>
                        </div>
                        <button
                            type="button"
                            onClick={handleToggleFavorite}
                            disabled={isFavoriteLoading || !restaurantInfo?.id}
                            className="ui-btn-secondary flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm disabled:opacity-60"
                            aria-label={isFavorite ? t('removeFavoriteRestaurant') : t('addFavoriteRestaurant')}
                        >
                            <Heart className="w-5 h-5" strokeWidth={2.5} fill={isFavorite ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    <div className="hidden md:flex flex-grow justify-center px-8">
                        <SearchBar value={searchQuery} onChange={setSearchQuery} />
                    </div>

                    <button
                        onClick={onOpenCart}
                        className={`relative flex items-center justify-center w-12 h-12 md:w-14 md:h-14 rounded-full transition-all shrink-0 ml-4 md:ml-0 shadow-sm ${cartLength > 0 ? 'ui-btn-primary shadow-red-200 shadow-lg hover:scale-105 active:scale-95' : 'ui-btn-secondary'}`}
                        aria-label={t('myOrder')}
                    >
                        <ShoppingCart className="w-6 h-6" strokeWidth={2.5} fill={cartLength > 0 ? "currentColor" : "none"} />
                        {totalItemsCount > 0 && (
                            <span className="absolute -top-1 -right-1 ui-btn-primary text-[11px] min-w-[22px] h-[22px] rounded-full flex items-center justify-center border-2 border-white shadow-sm font-bold">
                                {totalItemsCount}
                            </span>
                        )}
                    </button>
                </div>

                {/* Mobile Search Bar Row */}
                <div className="md:hidden pb-3 px-1">
                    <SearchBar value={searchQuery} onChange={setSearchQuery} />
                </div>

                <div className="relative group">
                    {canScrollLeft && (
                        <div className="absolute left-0 top-0 bottom-0 w-12 bg-gradient-to-r from-white to-transparent z-10 flex items-center">
                            <button onClick={() => scrollTabs('left')} className="p-1 text-red-600">
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
                                    className={`px-5 md:px-10 py-2.5 md:py-4 rounded-xl transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest border-2 flex-shrink-0 ${activeCategory === cat ? 'ui-btn-primary border-transparent shadow-xl scale-105' : 'ui-btn-secondary ui-text-muted'}`}
                                >
                                    {cat}
                                </button>
                            ))
                        )}
                    </div>
                    {canScrollRight && (
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-l from-white to-transparent z-10 flex items-center justify-end">
                            <button onClick={() => scrollTabs('right')} className="p-1 text-red-600">
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
