"use client";

import React, { useState } from 'react';
import { Heart, MessageCircle, Globe } from 'lucide-react';
import { useTranslations } from 'next-intl';

interface FeedItem {
    id: string;
    userName: string;
    restaurantName: string;
    caption: string;
    emoji: string;
    timestamp: string;
    likes: number;
}

export default function ActivityFeed() {
    const t = useTranslations('home.activityFeed');
    const feed: FeedItem[] = [
        {
            id: '1',
            userName: t('items.maria.userName'),
            restaurantName: t('items.maria.restaurantName'),
            caption: t('items.maria.caption'),
            emoji: '🍛',
            timestamp: t('items.maria.timestamp'),
            likes: 12
        },
        {
            id: '2',
            userName: t('items.carlos.userName'),
            restaurantName: t('items.carlos.restaurantName'),
            caption: t('items.carlos.caption'),
            emoji: '🍣',
            timestamp: t('items.carlos.timestamp'),
            likes: 5
        },
        {
            id: '3',
            userName: t('items.ana.userName'),
            restaurantName: t('items.ana.restaurantName'),
            caption: t('items.ana.caption'),
            emoji: '🍗',
            timestamp: t('items.ana.timestamp'),
            likes: 24
        }
    ];
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
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest">{t('title')}</h3>
            </div>

            <div className="flex overflow-x-auto pb-4 gap-4 snap-x hide-scrollbar px-1">
                {feed.map((item) => {
                    const isLiked = likedItems.has(item.id);
                    return (
                        <div key={item.id} className="flex w-[min(280px,calc(100vw-2.5rem))] shrink-0 snap-center flex-col rounded-[1.5rem] border border-gray-100 bg-white p-5 shadow-sm sm:w-[320px]">
                            <div className="flex items-start gap-4 mb-3">
                                <div className="w-12 h-12 rounded-full bg-orange-50 flex items-center justify-center text-2xl shadow-inner flex-shrink-0">
                                    {item.emoji}
                                </div>
                                <div className="min-w-0 flex-1 pt-1">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="break-words font-bold text-gray-900 text-sm">{item.userName}</p>
                                    </div>
                                    <span className="mb-2 inline-block break-words rounded-full bg-gray-50 px-2 py-0.5 text-[10px] font-medium text-gray-400">@{item.restaurantName} • {item.timestamp}</span>
                                </div>
                            </div>

                            <p className="mb-4 flex-grow break-words text-xs leading-relaxed text-gray-600">
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
                                    <span className="text-[10px] font-bold">{t('comment')}</span>
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
