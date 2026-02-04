"use client";

import { useState, useEffect, useCallback } from 'react';
import { RestaurantWithBranches, UserLocation } from '@/types';

interface UseRestaurantsOptions {
    categoryId?: string | null;
    userLocation?: UserLocation | null;
}

export function useRestaurants(options: UseRestaurantsOptions = {}) {
    const [restaurants, setRestaurants] = useState<RestaurantWithBranches[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const { categoryId, userLocation } = options;

    const fetchRestaurants = useCallback(async () => {
        setLoading(true);
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

    return { restaurants, loading, error, refetch: fetchRestaurants };
}
