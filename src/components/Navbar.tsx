"use client";

import React, { useMemo, useState } from 'react';
import { RestaurantInfo } from '../types';
import SearchBar from './SearchBar';
import OrderNotificationsTray from './OrderNotificationsTray';
import { useCartStore } from '@/store';

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
    const bidNotifications = useCartStore((state) => state.bidNotifications);
    const unreadCount = useMemo(
        () => bidNotifications.filter((notification) => !notification.read).length,
        [bidNotifications]
    );

    return (
        <div className="sticky top-0 bg-white shadow-2xl z-50 border-b border-gray-100">
            <div className="max-w-7xl mx-auto px-4 md:px-8 flex flex-col">
                <div className="flex items-center justify-between py-3 md:py-4">
                    <div className="flex items-center gap-2 md:gap-4">
                        <span className="text-red-600 text-lg md:text-2xl">🏮</span>
                        <button
                            onClick={toggleTestMode}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border-2 transition-all ${isTestMode ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-emerald-500 bg-emerald-50 text-emerald-600'}`}
                        >
                            <div className={`w-2 h-2 rounded-full ${isTestMode ? 'bg-orange-500' : 'bg-emerald-500'} animate-pulse`}></div>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">{isTestMode ? 'TEST' : 'PROD'}</span>
                        </button>
                        <button
                            onClick={onShowHistory}
                            className="flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 border-gray-200 bg-white hover:border-red-600 hover:bg-red-50 transition-all shadow-sm hover:shadow-md"
                        >
                            <span className="text-base md:text-lg">📦</span>
                            <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-700">Rastreo</span>
                        </button>
                        <button
                            type="button"
                            onClick={onChangeUser}
                            className="flex items-center gap-2 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 border-blue-200 bg-white hover:border-blue-600 hover:bg-blue-50 transition-all shadow-sm hover:shadow-md active:scale-95 z-10"
                        >
                            <span className="text-lg md:text-xl">👤</span>
                            <span className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-blue-800 truncate max-w-[80px] md:max-w-none">
                                {customerName || 'Usuario'}
                            </span>
                        </button>
                        <div className="relative">
                            <button
                                type="button"
                                onClick={() => setIsTrayOpen((current) => !current)}
                                className="relative flex items-center gap-1.5 px-3 py-1.5 md:px-4 md:py-2 rounded-xl border-2 border-gray-200 bg-white hover:border-red-600 hover:bg-red-50 transition-all shadow-sm hover:shadow-md"
                                aria-label="Abrir notificaciones de ofertas"
                            >
                                <span className="text-base md:text-lg">🔔</span>
                                <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest text-gray-700">Ofertas</span>
                                {unreadCount > 0 && (
                                    <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] min-w-5 h-5 px-1 rounded-full flex items-center justify-center border-2 border-white">
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
                        className={`relative flex items-center gap-2 px-4 py-2 md:px-5 md:py-3 rounded-xl transition-all border-2 ${cartLength > 0 ? 'bg-black text-white border-black shadow-lg scale-105' : 'bg-gray-50 text-gray-300 border-transparent opacity-60'}`}
                    >
                        🛒 <span className="text-[8px] md:text-[9px] font-black uppercase tracking-widest">Mi Pedido</span>
                        {totalItemsCount > 0 && <span className="absolute -top-2 -right-2 bg-red-600 text-white text-[8px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">{totalItemsCount}</span>}
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
                                    className={`px-5 md:px-10 py-2.5 md:py-4 rounded-xl transition-all text-[9px] md:text-[11px] font-black uppercase tracking-widest border-2 flex-shrink-0 ${activeCategory === cat ? 'bg-red-600 text-white border-red-600 shadow-xl scale-105' : 'text-gray-400 border-transparent bg-gray-50 hover:bg-gray-100 hover:text-gray-900'}`}
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
