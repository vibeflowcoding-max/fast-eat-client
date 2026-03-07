"use client";

import React from 'react';
import { Home, Search, Receipt, ShoppingCart, User } from 'lucide-react';
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
        { id: 'home', label: t('home'), icon: Home, path: '/' },
        { id: 'search', label: t('search'), icon: Search, path: '/search' },
        { id: 'carts', label: t('carts'), icon: ShoppingCart, path: '/carts' },
        { id: 'orders', label: t('orders'), icon: Receipt, path: '/orders' },
        { id: 'profile', label: t('profile'), icon: User, path: '/profile' },
    ];

    return (
        <div className="fixed bottom-5 left-1/2 z-40 w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 pb-safe">
            <div className="rounded-[2rem] border border-[var(--color-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.88)_0%,rgba(252,245,239,0.96)_100%)] p-2 shadow-[0_18px_50px_-26px_rgba(98,60,29,0.4)] backdrop-blur-2xl">
                <div className="grid grid-cols-5 gap-1">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => handleNavigation(item.path)}
                            className="relative flex min-h-[60px] flex-col items-center justify-center rounded-[1.35rem] px-2 py-2 transition-all duration-300 active:scale-[0.98]"
                        >
                            {isActive && (
                                <div className="absolute inset-x-3 inset-y-1 rounded-[1.15rem] bg-[linear-gradient(180deg,rgba(236,91,19,0.16)_0%,rgba(255,224,204,0.5)_100%)]" />
                            )}
                            
                            <div className={`relative z-10 flex h-10 w-10 items-center justify-center rounded-2xl transition-all duration-300 ${
                                isActive 
                                    ? 'bg-[linear-gradient(135deg,var(--color-brand)_0%,#fb923c_100%)] text-white shadow-[0_14px_28px_-18px_rgba(236,91,19,0.8)]' 
                                    : 'bg-transparent text-[var(--color-text-muted)]'
                            }`}>
                                <Icon 
                                    size={20} 
                                    strokeWidth={isActive ? 2.5 : 2} 
                                    className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'scale-100'}`}
                                />
                            </div>
                            
                            <span className={`relative z-10 mt-1 text-[10px] font-black tracking-[0.08em] transition-colors duration-300 ${
                                isActive 
                                    ? 'text-[var(--color-brand-strong)]' 
                                    : 'text-[var(--color-text-muted)]'
                            }`}>
                                {item.label}
                            </span>
                        </button>
                    );
                })}
                </div>
            </div>
        </div>
    );
}
