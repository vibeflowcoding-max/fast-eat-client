import { useState, useCallback, useRef } from 'react';
import { useCartStore } from '@/store';

interface DietaryCheckResult {
    is_safe: boolean;
    confidence: number;
    reason: string;
    estimated_macros?: {
        protein?: number;
        carbs?: number;
        fat?: number;
    };
}

export function useDietaryGuardian() {
    const { dietaryProfile } = useCartStore();
    const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
    const [resultsMap, setResultsMap] = useState<Record<string, DietaryCheckResult>>({});

    // In-memory cache to prevent redundant API calls during the session
    const cacheRef = useRef<Record<string, DietaryCheckResult>>({});

    const checkItem = useCallback(async (
        menuItem: { id: string; name: string; description?: string; ingredients?: string[] }
    ) => {
        // If no dietary profile is set or it's completely empty, we don't need to check
        if (!dietaryProfile || (
            dietaryProfile.diet === 'none' &&
            dietaryProfile.allergies.length === 0 &&
            dietaryProfile.intolerances.length === 0
        )) {
            return null;
        }

        const cacheKey = `${menuItem.id}-${JSON.stringify(dietaryProfile)}`;

        if (cacheRef.current[cacheKey]) {
            setResultsMap(prev => ({ ...prev, [menuItem.id]: cacheRef.current[cacheKey] }));
            return cacheRef.current[cacheKey];
        }

        setLoadingMap(prev => ({ ...prev, [menuItem.id]: true }));

        try {
            const response = await fetch('/api/discovery/dietary-check', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    menu_item: menuItem,
                    dietary_profile: dietaryProfile
                })
            });

            if (!response.ok) {
                throw new Error('Dietary check failed');
            }

            const data: DietaryCheckResult = await response.json();

            cacheRef.current[cacheKey] = data;
            setResultsMap(prev => ({ ...prev, [menuItem.id]: data }));

            return data;
        } catch (error) {
            console.error('[useDietaryGuardian] Check failed for item:', menuItem.id, error);
            // Return null on failure so we don't block the user from seeing the item, 
            // but we also don't falsely claim it's safe.
            return null;
        } finally {
            setLoadingMap(prev => ({ ...prev, [menuItem.id]: false }));
        }
    }, [dietaryProfile]);

    return {
        checkItem,
        isActive: !!dietaryProfile && (dietaryProfile.diet !== 'none' || dietaryProfile.allergies.length > 0 || dietaryProfile.intolerances.length > 0),
        loadingMap,
        resultsMap
    };
}
