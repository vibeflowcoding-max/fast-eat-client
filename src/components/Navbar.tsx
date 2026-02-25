"use client";

import React, { useMemo, useState } from 'react';
import { RestaurantInfo } from '../types';
import SearchBar from './SearchBar';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';
import { Package, User, ShoppingCart, Zap } from 'lucide-react';
import { useTranslations } from 'next-intl';

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
    onChangeUser: () => void;
    customerName: string;
    searchQuery: string;
    setSearchQuery: (val: string) => void;
}

const Navbar: React.FC<NavbarProps> = ({
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
    onChangeUser,
    customerName,
    searchQuery,
    setSearchQuery,
}) => {
    const [isTrayOpen, setIsTrayOpen] = useState(false);
    const t = useTranslations('nav');
    const bidNotifications = useCartStore((state) => state.bidNotifications);
    const unreadCount = useMemo(
        () => bidNotifications.filter((notification) => !notification.read).length,
        [bidNotifications]
    );

    return (
        <div className="sticky top-0 ui-panel shadow-2xl z-50 border-b">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col">
                <div className="flex items-center justify-between py-3 md:py-4">
                    <div className="flex items-center gap-3 md:gap-4 overflow-visible no-scrollbar scroll-smooth flex-nowrap pr-4 -mr-4 md:pr-0 md:mr-0">
                        <button
                            onClick={onShowHistory}
                            className="ui-btn-secondary flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                            aria-label={t('trackOrders')}
                        >
                            <Package className="w-5 h-5" strokeWidth={2.5} />
                        </button>
                        <button
                            type="button"
                            onClick={onChangeUser}
                            className="ui-btn-secondary flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all shrink-0 focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
                            aria-label={t('changeUser')}
                        >
                            <User className="w-5 h-5" strokeWidth={2.5} fill="currentColor" />
                        </button>
                        <div className="relative shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsTrayOpen((current) => !current)}
                                className="ui-btn-secondary relative flex items-center justify-center w-10 h-10 md:w-11 md:h-11 rounded-full transition-all focus:ring-2 focus:ring-[var(--color-brand)] focus:outline-none shadow-sm"
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
