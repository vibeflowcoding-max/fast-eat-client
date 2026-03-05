"use client";

import { useState, useEffect } from 'react';
import { RestaurantCategory } from '@/types';

const CATEGORIES_CACHE_TTL_MS = 5 * 60 * 1000;

let categoriesCache: RestaurantCategory[] | null = null;
let categoriesCacheAt = 0;

export function useCategories() {
    const [categories, setCategories] = useState<RestaurantCategory[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const now = Date.now();
        const hasFreshCache = categoriesCache && (now - categoriesCacheAt) < CATEGORIES_CACHE_TTL_MS;

        if (hasFreshCache) {
            setCategories(categoriesCache || []);
            setLoading(false);
            return;
        }

        const controller = new AbortController();

        async function fetchCategories() {
            try {
                const response = await fetch('/api/categories', { signal: controller.signal });
                if (!response.ok) {
                    throw new Error('Failed to fetch categories');
                }
                const data = await response.json();
                const normalized = Array.isArray(data) ? data : [];
                categoriesCache = normalized;
                categoriesCacheAt = Date.now();
                setCategories(normalized);
            } catch (err) {
                if (controller.signal.aborted) {
                    return;
                }
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                if (!controller.signal.aborted) {
                    setLoading(false);
                }
            }
        }

        fetchCategories();

        return () => {
            controller.abort();
        };
    }, []);

    return { categories, loading, error };
}
