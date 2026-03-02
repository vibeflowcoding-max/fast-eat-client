"use client";

import React from 'react';
import { Home, Search, Receipt, User } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useTranslations } from 'next-intl';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useAppRouter();
    const t = useTranslations('nav');

    const handleNavigation = (path: string) => {
        if (typeof window !== 'undefined' && path === '/') {
            window.dispatchEvent(new CustomEvent('fast-eat:navigate-home'));
        }

        if (pathname === path) {
            if (path === '/') {
                router.replace('/');
            }
            return;
        }

        router.push(path);
    };

    const navItems = [
        { 
            id: 'home', label: t('home'), icon: Home, path: '/',
            activeBg: 'bg-gradient-to-tr from-red-500 to-red-600',
            glowColor: 'bg-red-500',
            activeText: 'text-red-600'
        },
        { 
            id: 'search', label: t('search'), icon: Search, path: '/search',
            activeBg: 'bg-gradient-to-tr from-red-500 to-red-600',
            glowColor: 'bg-red-500',
            activeText: 'text-red-600'
        },
        { 
            id: 'orders', label: t('orders'), icon: Receipt, path: '/orders',
            activeBg: 'bg-gradient-to-tr from-red-500 to-red-600',
            glowColor: 'bg-red-500',
            activeText: 'text-red-600'
        },
        { 
            id: 'profile', label: t('profile'), icon: User, path: '/profile',
            activeBg: 'bg-gradient-to-tr from-red-500 to-red-600',
            glowColor: 'bg-red-500',
            activeText: 'text-red-600'
        },
    ];

    return (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-2rem)] max-w-md pb-safe">
            <div className="bg-white/70 backdrop-blur-3xl border border-white/60 shadow-[0_8px_32px_rgba(0,0,0,0.12)] rounded-[2rem] p-2 flex items-center justify-between">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigation(item.path)}
                            className="relative flex flex-col items-center justify-center flex-1 h-14 active:scale-90 transition-all duration-300 group"
                        >
                            {isActive && (
                                <div className={`absolute inset-0 m-auto w-10 h-10 rounded-full blur-xl opacity-50 ${item.glowColor}`} />
                            )}
                            
                            <div className={`relative flex items-center justify-center w-12 h-12 rounded-2xl transition-all duration-500 z-10 ${
                                isActive 
                                    ? `${item.activeBg} text-white shadow-lg -translate-y-2` 
                                    : 'bg-transparent text-gray-400 group-hover:text-gray-600'
                            }`}>
                                <Icon 
                                    size={22} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={`transition-transform duration-500 ${isActive ? 'scale-110' : 'scale-100'}`}
                                />
                            </div>
                            
                            <span className={`absolute bottom-0 text-[10px] font-black tracking-wide transition-all duration-500 ${
                                isActive 
                                    ? `opacity-100 translate-y-1 ${item.activeText}` 
                                    : 'opacity-0 translate-y-4 text-gray-400'
                            }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
