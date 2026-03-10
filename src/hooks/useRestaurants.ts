"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RestaurantWithBranches, UserLocation } from '@/types';

interface UseRestaurantsOptions {
    categoryId?: string | null;
    userLocation?: UserLocation | null;
}

interface RestaurantCacheEntry {
    data: RestaurantWithBranches[];
    cachedAt: number;
}

const MIN_SUGGESTION_QUERY_LENGTH = 2;
const MAX_SUGGESTION_CACHE_ENTRIES = 25;
const RESTAURANTS_CACHE_TTL_MS = 5 * 60 * 1000;

const restaurantsCache = new Map<string, RestaurantCacheEntry>();
const restaurantsInflight = new Map<string, Promise<RestaurantWithBranches[]>>();

function isAbortLikeError(error: unknown): boolean {
    if (error instanceof DOMException && error.name === 'AbortError') {
        return true;
    }

    if (error instanceof Error) {
        const normalized = error.message.toLowerCase();
        return normalized.includes('aborted') || normalized.includes('signal is aborted');
    }

    return false;
}

function normalizeQuery(value: string): string {
    return value.trim().toLowerCase();
}

function rankRestaurantsByQuery(restaurants: RestaurantWithBranches[], normalizedQuery: string): RestaurantWithBranches[] {
    const exact: RestaurantWithBranches[] = [];
    const startsWith: RestaurantWithBranches[] = [];
    const includes: RestaurantWithBranches[] = [];

    restaurants.forEach((restaurant) => {
        const restaurantName = restaurant.name.trim().toLowerCase();
        const categoryNames = restaurant.categories.map((category) => category.name.trim().toLowerCase());
        const hasExactCategory = categoryNames.some((name) => name === normalizedQuery);
        const hasStartsWithCategory = categoryNames.some((name) => name.startsWith(normalizedQuery));
        const hasIncludesCategory = categoryNames.some((name) => name.includes(normalizedQuery));

        if (restaurantName === normalizedQuery || hasExactCategory) {
            exact.push(restaurant);
            return;
        }

        if (restaurantName.startsWith(normalizedQuery) || hasStartsWithCategory) {
            startsWith.push(restaurant);
            return;
        }

        if (restaurantName.includes(normalizedQuery) || hasIncludesCategory) {
            includes.push(restaurant);
        }
    });

    return [...exact, ...startsWith, ...includes];
}

export function useRestaurants({ categoryId, userLocation }: UseRestaurantsOptions = {}) {
    const [restaurants, setRestaurants] = useState<RestaurantWithBranches[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const suggestionCacheRef = useRef<Map<string, RestaurantWithBranches[]>>(new Map());
    const latitude = userLocation?.lat;
    const longitude = userLocation?.lng;

    const buildCacheKey = useCallback(() => {
        return JSON.stringify({
            categoryId: categoryId || null,
            lat: typeof latitude === 'number' ? Number(latitude.toFixed(3)) : null,
            lng: typeof longitude === 'number' ? Number(longitude.toFixed(3)) : null,
        });
    }, [categoryId, latitude, longitude]);

    const setSuggestionCache = useCallback((key: string, value: RestaurantWithBranches[]) => {
        const cache = suggestionCacheRef.current;
        if (cache.has(key)) {
            cache.delete(key);
        }

        cache.set(key, value);

        if (cache.size > MAX_SUGGESTION_CACHE_ENTRIES) {
            const oldestKey = cache.keys().next().value;
            if (oldestKey) {
                cache.delete(oldestKey);
            }
        }
    }, []);

    const fetchRestaurants = useCallback(async (signal?: AbortSignal) => {
        const cacheKey = buildCacheKey();
        const cachedEntry = restaurantsCache.get(cacheKey);
        let loader: Promise<RestaurantWithBranches[]> | undefined;

        if (cachedEntry && (Date.now() - cachedEntry.cachedAt) < RESTAURANTS_CACHE_TTL_MS) {
            setRestaurants(cachedEntry.data);
            setLoading(false);
            setError(null);
            return cachedEntry.data;
        }

        if (cachedEntry) {
            setRestaurants(cachedEntry.data);
        }

        setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();

            if (categoryId) {
                params.set('categoryId', categoryId);
            }

            if (typeof latitude === 'number' && typeof longitude === 'number') {
                params.set('lat', latitude.toString());
                params.set('lng', longitude.toString());
            }

            const url = `/api/restaurants${params.toString() ? `?${params.toString()}` : ''}`;
            const existingLoader = restaurantsInflight.get(cacheKey);
            loader = existingLoader || (async () => {
                const response = await fetch(url);

                if (!response.ok) {
                    throw new Error('Failed to fetch restaurants');
                }

                const data = await response.json();
                const normalized = Array.isArray(data) ? data : [];
                restaurantsCache.set(cacheKey, {
                    data: normalized,
                    cachedAt: Date.now(),
                });
                return normalized;
            })();

            restaurantsInflight.set(cacheKey, loader);
            const data = await loader;
            if (!signal?.aborted) {
                setRestaurants(data);
            }
            return data;
        } catch (err) {
            if (signal?.aborted || isAbortLikeError(err)) {
                return cachedEntry?.data ?? [];
            }

            setError(err instanceof Error ? err.message : 'Unknown error');
            return cachedEntry?.data ?? [];
        } finally {
            if (loader && restaurantsInflight.get(cacheKey) === loader) {
                restaurantsInflight.delete(cacheKey);
            }

            if (!signal?.aborted) {
                setLoading(false);
            }
        }
    }, [buildCacheKey, categoryId, latitude, longitude]);

    useEffect(() => {
        const controller = new AbortController();

        void fetchRestaurants(controller.signal);

        return () => {
            controller.abort();
        };
    }, [fetchRestaurants]);

    const fetchSuggestions = useCallback(async (rawQuery: string, signal?: AbortSignal) => {
        const normalizedQuery = normalizeQuery(rawQuery);

        if (normalizedQuery.length < MIN_SUGGESTION_QUERY_LENGTH) {
            return [] as RestaurantWithBranches[];
        }

        const cache = suggestionCacheRef.current;

        if (cache.has(normalizedQuery)) {
            return cache.get(normalizedQuery) ?? [];
        }

        for (let prefixLength = normalizedQuery.length - 1; prefixLength >= MIN_SUGGESTION_QUERY_LENGTH; prefixLength -= 1) {
            const prefix = normalizedQuery.slice(0, prefixLength);
            const cachedPrefixResults = cache.get(prefix);
            if (!cachedPrefixResults) {
                continue;
            }

            const rankedFromPrefix = rankRestaurantsByQuery(cachedPrefixResults, normalizedQuery);
            setSuggestionCache(normalizedQuery, rankedFromPrefix);
            return rankedFromPrefix;
        }

        const params = new URLSearchParams();
        params.set('query', normalizedQuery);

        if (typeof latitude === 'number' && typeof longitude === 'number') {
            params.set('lat', latitude.toString());
            params.set('lng', longitude.toString());
        }

        const response = await fetch(`/api/restaurants?${params.toString()}`, { signal });

        if (!response.ok) {
            throw new Error('Failed to fetch suggestions');
        }

        const result = (await response.json()) as RestaurantWithBranches[];
        const rankedResults = rankRestaurantsByQuery(result, normalizedQuery);
        setSuggestionCache(normalizedQuery, rankedResults);
        return rankedResults;
    }, [latitude, longitude, setSuggestionCache]);

    return {
        restaurants,
        loading,
        error,
        refetch: () => fetchRestaurants(),
        fetchSuggestions,
    };
}
