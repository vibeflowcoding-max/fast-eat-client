"use client";

import React, { useState } from 'react';
import { Heart, MessageCircle, Globe } from 'lucide-react';

interface FeedItem {
    id: string;
    userName: string;
    restaurantName: string;
    caption: string;
    emoji: string;
    timestamp: string;
    likes: number;
}

const MOCK_ITEMS: FeedItem[] = [
    {
        id: '1',
        userName: 'María',
        restaurantName: 'La Casona',
        caption: '¡María no se aguantó las ganas y pidió 2x Casado con Carne en La Casona! Mae, al chile qué buen antojo.',
        emoji: '🍛',
        timestamp: 'Hace 5 min',
        likes: 12
    },
    {
        id: '2',
        userName: 'Carlos',
        restaurantName: 'Sushi Go',
        caption: 'Carlos se puso fino y pidió un Roll Volcano en Sushi Go. ¡A cachete!',
        emoji: '🍣',
        timestamp: 'Hace 1 hora',
        likes: 5
    },
    {
        id: '3',
        userName: 'Ana',
        restaurantName: 'KFC',
        caption: 'Ana aseguró su cena con un MEGA Combo. Puro sabor 🤤',
        emoji: '🍗',
        timestamp: 'Hace 3 horas',
        likes: 24
    }
];

export default function ActivityFeed() {
    const [feed] = useState<FeedItem[]>(MOCK_ITEMS);
    const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

    const toggleLike = (id: string) => {
        setLikedItems(prev => {
            const newSet = new Set(prev);
            if (newSet.has(id)) newSet.delete(id);
            else newSet.add(id);
            return newSet;
        });
    };

    return (
        <div className="w-full space-y-4 mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Globe className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">Actividad de Amigos</h3>
            </div>

            <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar px-1">
                {feed.map((item) => {
                    const isLiked = likedItems.has(item.id);
                    return (
                        <div key={item.id} className="bg-white rounded-[1.5rem] p-5 shadow-sm border border-gray-100 min-w-[280px] sm:min-w-[320px] max-w-[320px] snap-center flex-shrink-0 flex flex-col">
                            <div className="flex items-start gap-4 mb-3">
                                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                                    {item.emoji}
                                </div>
                                <div className="flex-1 pt-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="font-bold text-gray-900 text-sm">{item.userName}</p>
                                    </div>
                                    <span className="text-[10px] text-gray-400 font-medium bg-gray-50 px-2 py-0.5 rounded-full inline-block mb-2">@{item.restaurantName} • {item.timestamp}</span>
                                </div>
                            </div>

                            <p className="text-xs text-gray-600 mb-4 leading-relaxed flex-grow">
                                {item.caption}
                            </p>

                            <div className="flex gap-4 border-t border-gray-50 pt-3 mt-auto">
                                <button
                                    onClick={() => toggleLike(item.id)}
                                    className={`flex items-center gap-1.5 transition-colors ${isLiked ? 'text-red-500' : 'text-gray-400 hover:text-red-400'}`}
                                >
                                    <Heart className={`w-4 h-4 ${isLiked ? 'fill-current' : ''}`} />
                                    <span className="text-[10px] font-bold">{item.likes + (isLiked ? 1 : 0)}</span>
                                </button>
                                <button className="flex items-center gap-1.5 text-gray-400 hover:text-blue-500 transition-colors">
                                    <MessageCircle className="w-4 h-4" />
                                    <span className="text-[10px] font-bold">Comentar</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
