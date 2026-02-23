"use client";

import React from 'react';
import { Home, Search, Receipt, User } from 'lucide-react';
import { usePathname, useRouter } from 'next/navigation';

export default function BottomNav() {
    const pathname = usePathname();
    const router = useRouter();

    const navItems = [
        { id: 'home', label: 'Inicio', icon: Home, path: '/' },
        { id: 'search', label: 'Buscar', icon: Search, path: '/search' },
        { id: 'orders', label: 'Pedidos', icon: Receipt, path: '/orders' },
        { id: 'profile', label: 'Perfil', icon: User, path: '/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-gray-200 bg-white pb-safe">
            <div className="flex h-16 items-center justify-around px-2">
                {navItems.map((item) => {
                    const isActive = pathname === item.path;
                    const Icon = item.icon;

                    return (
                        <button
                            key={item.id}
                            type="button"
                            onClick={() => router.push(item.path)}
                            className={`flex flex-col items-center justify-center w-16 gap-1 ${
                                isActive ? 'text-orange-500' : 'text-gray-500 hover:text-gray-900'
                            }`}
                        >
                            <Icon size={24} strokeWidth={isActive ? 2.5 : 2} />
                            <span className="text-[10px] font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
