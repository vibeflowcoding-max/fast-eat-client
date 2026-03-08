"use client";

import { useState, useEffect } from 'react';
import { RestaurantCategory } from '@/types';

const CATEGORIES_CACHE_TTL_MS = 5 * 60 * 1000;

let categoriesCache: RestaurantCategory[] | null = null;
let categoriesCacheAt = 0;
let categoriesInflightPromise: Promise<RestaurantCategory[]> | null = null;

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
                const loader = categoriesInflightPromise || (async () => {
                    const response = await fetch('/api/categories');
                    if (!response.ok) {
                        throw new Error('Failed to fetch categories');
                    }
                    const data = await response.json();
                    const normalized = Array.isArray(data) ? data : [];
                    categoriesCache = normalized;
                    categoriesCacheAt = Date.now();
                    return normalized;
                })();

                categoriesInflightPromise = loader;
                const normalized = await loader;

                if (!controller.signal.aborted) {
                    setCategories(normalized);
                }
            } catch (err) {
                if (controller.signal.aborted || isAbortLikeError(err)) {
                    return;
                }
                setError(err instanceof Error ? err.message : 'Unknown error');
            } finally {
                categoriesInflightPromise = null;
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
