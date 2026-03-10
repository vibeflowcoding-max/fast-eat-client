"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { RestaurantInfo } from '../types';
import SearchBar from './SearchBar';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';
import { Package, ShoppingCart, Zap, Heart, Star, ArrowLeft, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { supabase } from '@/lib/supabase';
import { audioManager } from '@/lib/audio';
import { BidNotification } from '@/types';
import { Button, Surface } from '@/../resources/components';
import { cn } from '@/../resources/components/utils';

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
    const [isTrayOpen, setIsTrayOpen] = useState(false);
    const [trayStyle, setTrayStyle] = useState<{ top: number; left: number; width: number } | null>(null);
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
    const clientContext = useCartStore((state) => state.clientContext);
    const hydrateClientContext = useCartStore((state) => state.hydrateClientContext);
    const markBidNotificationRead = useCartStore((state) => state.markBidNotificationRead);
    const setDeepLinkTarget = useCartStore((state) => state.setDeepLinkTarget);
    const unreadNotifications = useMemo(
        () => bidNotifications.filter((notification) => !notification.read),
        [bidNotifications]
    );
    const unreadCount = unreadNotifications.length;
    const trayContainerRef = useRef<HTMLDivElement | null>(null);
    const trayTriggerRef = useRef<HTMLDivElement | null>(null);
    const trayRestoreFocusRef = useRef(false);

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

        if (restaurantInfo?.id && cachedFavorites.length > 0) {
            setIsFavorite(cachedFavorites.includes(restaurantInfo.id));
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

        if (!restaurantInfo?.id || cachedFavorites.length === 0) {
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

    useEffect(() => {
        if (!isTrayOpen) {
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const targetNode = event.target as Node | null;
            if (!targetNode) {
                return;
            }

            if (trayContainerRef.current?.contains(targetNode) || trayTriggerRef.current?.contains(targetNode)) {
                return;
            }

            setIsTrayOpen(false);
            if (typeof window !== 'undefined') {
                window.dispatchEvent(new CustomEvent('fast-eat:notifications_tray_dismissed', {
                    detail: { source: 'outside_click' },
                }));
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setIsTrayOpen(false);
                if (typeof window !== 'undefined') {
                    window.dispatchEvent(new CustomEvent('fast-eat:notifications_tray_dismissed', {
                        detail: { source: 'escape_key' },
                    }));
                }
            }
        };

        window.addEventListener('pointerdown', handlePointerDown);
        window.addEventListener('keydown', handleKeyDown);

        return () => {
            window.removeEventListener('pointerdown', handlePointerDown);
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isTrayOpen]);

    useEffect(() => {
        if (!isTrayOpen) {
            if (trayRestoreFocusRef.current) {
                trayTriggerRef.current?.querySelector<HTMLElement>('button')?.focus();
                trayRestoreFocusRef.current = false;
            }
            return;
        }

        trayRestoreFocusRef.current = true;

        const focusTray = window.requestAnimationFrame(() => {
            trayContainerRef.current?.focus();
        });

        return () => {
            window.cancelAnimationFrame(focusTray);
        };
    }, [isTrayOpen]);

    useEffect(() => {
        if (!isTrayOpen) {
            setTrayStyle(null);
            return;
        }

        const updateTrayPosition = () => {
            const trigger = trayTriggerRef.current;
            if (!trigger) {
                return;
            }

            const rect = trigger.getBoundingClientRect();
            const viewportWidth = window.innerWidth;
            const horizontalPadding = 16;
            const trayWidth = Math.min(392, viewportWidth - horizontalPadding * 2);
            const isMobileViewport = viewportWidth < 768;
            const centeredLeft = Math.max(horizontalPadding, Math.round((viewportWidth - trayWidth) / 2));
            const anchoredLeft = Math.min(
                Math.max(horizontalPadding, Math.round(rect.right - trayWidth)),
                Math.max(horizontalPadding, viewportWidth - trayWidth - horizontalPadding),
            );

            setTrayStyle({
                top: Math.round(rect.bottom + 14),
                left: isMobileViewport ? centeredLeft : anchoredLeft,
                width: trayWidth,
            });
        };

        updateTrayPosition();

        window.addEventListener('resize', updateTrayPosition);
        window.addEventListener('scroll', updateTrayPosition, true);

        return () => {
            window.removeEventListener('resize', updateTrayPosition);
            window.removeEventListener('scroll', updateTrayPosition, true);
        };
    }, [isTrayOpen]);

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
                {activeStatusCue && (
                    <div className="pt-3">
                        <Surface className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-slate-200 px-3 py-2 dark:border-slate-700" padding="none" variant="muted">
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
                                className="flex-1 text-left"
                                aria-label={t('trackOrders')}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-300">{tTracking('statusUpdated')}</p>
                                <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{activeStatusCue.description}</p>
                            </button>
                            <Button
                                onClick={dismissStatusCue}
                                className="size-8 rounded-full"
                                aria-label={t('dismissOrderStatusNotification')}
                                size="icon"
                                variant="outline"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </Surface>
                    </div>
                )}
                {activeCue && (
                    <div className="pt-3">
                        <Surface className="flex items-center justify-between gap-3 rounded-[1.3rem] border border-orange-200 px-3 py-2 text-orange-700 animate-pulse dark:border-orange-400/30 dark:text-orange-200" padding="none" variant="raised">
                            <button
                                type="button"
                                onClick={() => openFromCue(activeCue)}
                                className="flex-1 text-left"
                                aria-label={t('openOfferNotifications')}
                            >
                                <p className="text-[10px] font-black uppercase tracking-widest">{t('newOfferReceived')}</p>
                                <p className="text-xs font-semibold">Orden #{activeCue.orderId.slice(0, 8)} · ₡{Math.round(activeCue.bid.bidAmount).toLocaleString()}</p>
                            </button>
                            <Button
                                onClick={() => dismissCue(activeCue)}
                                className="size-8 rounded-full"
                                aria-label={t('dismissBidNotification')}
                                size="icon"
                                variant="outline"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </Surface>
                    </div>
                )}
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
                        <div ref={trayTriggerRef} className="relative shrink-0">
                            <Button
                                className="relative h-10 w-10 rounded-full md:h-11 md:w-11"
                                onClick={() => {
                                    setIsTrayOpen((current) => {
                                        const next = !current;

                                        if (typeof window !== 'undefined') {
                                            window.dispatchEvent(new CustomEvent(next ? 'fast-eat:notifications_tray_impression' : 'fast-eat:notifications_tray_dismissed', {
                                                detail: { source: 'navbar_button' },
                                            }));
                                        }

                                        return next;
                                    });
                                }}
                                aria-label={t('openOfferNotifications')}
                                size="icon"
                                variant="outline"
                            >
                                <Zap className="w-5 h-5" strokeWidth={2.5} fill="currentColor" />
                                {unreadCount > 0 && (
                                    <span className="absolute -right-1 -top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full border-2 border-white bg-orange-600 px-1 text-[10px] font-bold text-white shadow-sm dark:border-slate-900">
                                        {unreadCount}
                                    </span>
                                )}
                            </Button>
                        </div>
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
                            className="h-10 w-10 shrink-0 rounded-full md:h-11 md:w-11"
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
            {isTrayOpen && trayStyle && typeof document !== 'undefined'
                ? createPortal(
                    <>
                        <div
                            className="fixed inset-0 z-[110] bg-[#221610]/46 backdrop-blur-md"
                            aria-hidden="true"
                        />
                        <div
                            ref={trayContainerRef}
                            className="fixed z-[120]"
                            tabIndex={-1}
                            role="dialog"
                            aria-modal="true"
                            aria-label={t('openOfferNotifications')}
                            style={{
                                top: `${trayStyle.top}px`,
                                left: `${trayStyle.left}px`,
                                width: `${trayStyle.width}px`,
                            }}
                        >
                            <OrderNotificationsTray
                                onOpenTracking={() => {
                                    onShowHistory();
                                    setIsTrayOpen(false);
                                }}
                                onClose={() => setIsTrayOpen(false)}
                            />
                        </div>
                    </>,
                    document.body,
                )
                : null}
        </div>
    );
};

export default Navbar;
