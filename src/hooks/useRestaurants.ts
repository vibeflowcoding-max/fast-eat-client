"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { RestaurantWithBranches, UserLocation } from '@/types';

interface UseRestaurantsOptions {
    categoryId?: string | null;
    userLocation?: UserLocation | null;
}

const MIN_SUGGESTION_QUERY_LENGTH = 2;
const MAX_SUGGESTION_CACHE_ENTRIES = 25;

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

    const fetchRestaurants = useCallback(async () => {
        // Only show loading if we don't have data yet to avoid flicker/loop issues
        if (restaurants.length === 0) setLoading(true);
        setError(null);

        try {
            const params = new URLSearchParams();

            if (categoryId) {
                params.set('categoryId', categoryId);
            }

            if (userLocation) {
                params.set('lat', userLocation.lat.toString());
                params.set('lng', userLocation.lng.toString());
            }

            const url = `/api/restaurants${params.toString() ? `?${params.toString()}` : ''}`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error('Failed to fetch restaurants');
            }

            const data = await response.json();
            setRestaurants(data);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    }, [categoryId, userLocation]);

    useEffect(() => {
        fetchRestaurants();
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

        if (userLocation) {
            params.set('lat', userLocation.lat.toString());
            params.set('lng', userLocation.lng.toString());
        }

        const response = await fetch(`/api/restaurants?${params.toString()}`, { signal });

        if (!response.ok) {
            throw new Error('Failed to fetch suggestions');
        }

        const result = (await response.json()) as RestaurantWithBranches[];
        const rankedResults = rankRestaurantsByQuery(result, normalizedQuery);
        setSuggestionCache(normalizedQuery, rankedResults);
        return rankedResults;
    }, [setSuggestionCache, userLocation]);

    return { restaurants, loading, error, refetch: fetchRestaurants, fetchSuggestions };
}
