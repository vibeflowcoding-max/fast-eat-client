"use client";

import React, { useState, useRef, useEffect } from 'react';
import StoryVideoPlayer, { StoryVideoItem } from './StoryVideoPlayer';
import { Clapperboard } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTranslations } from 'next-intl';

interface StoryApiItem {
    id?: string;
    restaurantId?: string | null;
    restaurantName?: string | null;
    itemName?: string | null;
    price?: number | null;
    videoUrl?: string | null;
    description?: string | null;
}

function normalizeStories(payload: unknown): StoryVideoItem[] {
    if (!Array.isArray(payload)) {
        return [];
    }

    return payload
        .map((raw) => {
            const item = raw as StoryApiItem;
            if (
                typeof item?.id !== 'string' ||
                typeof item?.restaurantId !== 'string' ||
                typeof item?.restaurantName !== 'string' ||
                typeof item?.itemName !== 'string' ||
                typeof item?.videoUrl !== 'string' ||
                typeof item?.description !== 'string' ||
                typeof item?.price !== 'number'
            ) {
                return null;
            }

            if (!Number.isFinite(item.price) || item.price < 0) {
                return null;
            }

            return {
                id: item.id,
                restaurantId: item.restaurantId,
                restaurantName: item.restaurantName,
                itemName: item.itemName,
                price: item.price,
                videoUrl: item.videoUrl,
                description: item.description
            } satisfies StoryVideoItem;
        })
        .filter((item): item is StoryVideoItem => item !== null);
}

export default function StoryMenuFeed() {
    const t = useTranslations('home.storyFeed');
    const [stories, setStories] = useState<StoryVideoItem[]>([]);
    const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
    const [isMuted, setIsMuted] = useState(true);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [reloadToken, setReloadToken] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const abortController = new AbortController();

        async function loadStories() {
            setIsLoading(true);
            setError(null);

            try {
                const { data } = await supabase.auth.getSession();
                const accessToken = data.session?.access_token;

                if (!accessToken) {
                    throw new Error(t('authRequired'));
                }

                const response = await fetch('/api/consumer/content/stories', {
                    method: 'GET',
                    headers: {
                        Authorization: `Bearer ${accessToken}`
                    },
                    cache: 'no-store',
                    signal: abortController.signal
                });

                const payload: unknown = await response.json();
                if (!response.ok) {
                    throw new Error(t('loadError'));
                }

                const list = normalizeStories((payload as { data?: unknown })?.data);
                setStories(list);
                setActiveStoryId((prev) => {
                    if (prev && list.some((story) => story.id === prev)) {
                        return prev;
                    }

                    return list[0]?.id ?? null;
                });
            } catch (fetchError) {
                if (abortController.signal.aborted) {
                    return;
                }

                setStories([]);
                setActiveStoryId(null);
                setError(fetchError instanceof Error ? fetchError.message : t('loadError'));
            } finally {
                if (!abortController.signal.aborted) {
                    setIsLoading(false);
                }
            }
        }

        loadStories();

        return () => {
            abortController.abort();
        };
    }, [reloadToken, t]);

    useEffect(() => {
        if (!stories.length) {
            return;
        }

        const container = containerRef.current;
        if (!container) return;

        const observer = new IntersectionObserver(
            (entries) => {
                // Find the video that is currently most visible
                entries.forEach((entry) => {
                    if (entry.isIntersecting && entry.intersectionRatio >= 0.5) {
                        const storyId = entry.target.getAttribute('data-story-id');
                        if (storyId && storyId !== activeStoryId) {
                            setActiveStoryId(storyId);
                        }
                    }
                });
            },
            {
                root: container,
                threshold: 0.5, // Trigger when 50% of the video is visible
            }
        );

        const children = container.querySelectorAll('.story-container');
        children.forEach((child) => observer.observe(child));

        return () => {
            children.forEach((child) => observer.unobserve(child));
        };
    }, [activeStoryId, stories]);

    return (
        <div className="w-full mb-8">
            <div className="flex items-center gap-2 mb-4 px-1">
                <Clapperboard className="w-5 h-5 text-red-500" />
                <h3 className="text-sm font-bold text-gray-900 uppercase tracking-widest dark:text-slate-100">{t('title')}</h3>
            </div>

            {isLoading && (
                <div className="px-1 py-6 text-sm text-gray-500 dark:text-slate-400">{t('loading')}</div>
            )}

            {!isLoading && error && (
                <div className="px-1 py-3">
                    <p className="text-sm text-red-600">{error}</p>
                    <button
                        type="button"
                        onClick={() => setReloadToken((prev) => prev + 1)}
                        className="mt-2 text-xs font-bold text-red-600 underline"
                    >
                        {t('retry')}
                    </button>
                </div>
            )}

            {!isLoading && !error && stories.length === 0 && (
                <div className="px-1 py-6 text-sm text-gray-500 dark:text-slate-400">{t('empty')}</div>
            )}

            {/* Snap Scrolling Container */}
            {!isLoading && !error && stories.length > 0 && (
                <div
                    ref={containerRef}
                    className="flex overflow-x-auto gap-4 snap-x snap-mandatory hide-scrollbar px-1 pb-4"
                    style={{ scrollBehavior: 'smooth' }}
                >
                    {stories.map((story) => (
                        <div
                            key={story.id}
                            data-story-id={story.id}
                            className="story-container relative h-[450px] w-[min(82vw,280px)] flex-shrink-0 snap-center overflow-hidden rounded-3xl shadow-lg sm:h-[500px] sm:w-[320px]"
                        >
                            <StoryVideoPlayer
                                item={story}
                                isActive={story.id === activeStoryId}
                                isMuted={isMuted}
                                onToggleMute={() => setIsMuted(prev => !prev)}
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
