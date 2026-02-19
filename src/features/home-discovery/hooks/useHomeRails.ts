import { useMemo } from 'react';
import { RestaurantWithBranches } from '@/types';
import {
    DiscoveryIntent,
    HomeFiltersState,
    HomePreferenceHints,
    HomeRail,
    HomeSortOption,
    ViewedRestaurantSignal
} from '../types';

interface UseHomeRailsOptions {
    restaurants: RestaurantWithBranches[];
    activeIntent: DiscoveryIntent | null;
    filters: HomeFiltersState;
    sortBy: HomeSortOption;
    personalizedEnabled?: boolean;
    isReturningSession?: boolean;
    viewedHistory?: ViewedRestaurantSignal[];
    preferenceHints?: HomePreferenceHints;
}

const COMBO_BUDGET_CENTS = 9000;
const BASE_BASKET_CENTS = 6900;
const BUDGET_PRICE_MAX = 9000;
const MID_PRICE_MAX = 14000;
const ETA_DEFAULT_MINUTES = 45;

const PERSONALIZED_MIN_HISTORY = 2;

export function estimateDeliveryFee(restaurant: RestaurantWithBranches) {
    if (typeof restaurant.estimated_delivery_fee === 'number') {
        return restaurant.estimated_delivery_fee;
    }

    const distance = restaurant.distance ?? 6;
    if (distance <= 2) return 700;
    if (distance <= 5) return 1000;
    return 1400;
}

function estimateEta(restaurant: RestaurantWithBranches) {
    if (typeof restaurant.eta_min === 'number' && restaurant.eta_min > 0) {
        return restaurant.eta_min;
    }

    const distance = restaurant.distance ?? 5;
    return Math.max(15, Math.round(distance * 8));
}

export function estimateFinalPrice(restaurant: RestaurantWithBranches) {
    if (typeof restaurant.avg_price_estimate === 'number') {
        return restaurant.avg_price_estimate;
    }

    const promoDiscount = restaurant.promo_text ? 900 : 400;
    return BASE_BASKET_CENTS + estimateDeliveryFee(restaurant) - promoDiscount;
}

function matchesPriceBand(restaurant: RestaurantWithBranches, priceBand: HomeFiltersState['price_band']) {
    if (!priceBand) {
        return true;
    }

    const finalPrice = estimateFinalPrice(restaurant);

    if (priceBand === 'budget') {
        return finalPrice <= BUDGET_PRICE_MAX;
    }

    if (priceBand === 'mid') {
        return finalPrice > BUDGET_PRICE_MAX && finalPrice <= MID_PRICE_MAX;
    }

    return finalPrice > MID_PRICE_MAX;
}

export function applyHomeFilters(restaurants: RestaurantWithBranches[], filters: HomeFiltersState) {
    return restaurants.filter((restaurant) => {
        if (!matchesPriceBand(restaurant, filters.price_band)) {
            return false;
        }

        if (typeof filters.eta_max === 'number' && estimateEta(restaurant) > filters.eta_max) {
            return false;
        }

        if (typeof filters.rating_min === 'number' && (restaurant.rating ?? 0) < filters.rating_min) {
            return false;
        }

        if (typeof filters.delivery_fee_max === 'number' && estimateDeliveryFee(restaurant) > filters.delivery_fee_max) {
            return false;
        }

        if (filters.promotions_only && !restaurant.promo_text) {
            return false;
        }

        return true;
    });
}

export function sortRestaurants(restaurants: RestaurantWithBranches[], sortBy: HomeSortOption) {
    const sorted = [...restaurants];

    sorted.sort((left, right) => {
        if (sortBy === 'fastest') {
            return estimateEta(left) - estimateEta(right);
        }

        if (sortBy === 'top_rated') {
            return (right.rating ?? 0) - (left.rating ?? 0);
        }

        if (sortBy === 'closest') {
            return (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER);
        }

        const leftValueScore = estimateFinalPrice(left) - (left.rating ?? 0) * 100;
        const rightValueScore = estimateFinalPrice(right) - (right.rating ?? 0) * 100;
        return leftValueScore - rightValueScore;
    });

    return sorted;
}

export function sortByIntent(restaurants: RestaurantWithBranches[], activeIntent: DiscoveryIntent | null) {
    if (!activeIntent) {
        return restaurants;
    }

    const sorted = [...restaurants];

    sorted.sort((left, right) => {
        switch (activeIntent) {
            case 'fast': {
                return estimateEta(left) - estimateEta(right);
            }
            case 'best_rated':
                return (right.rating ?? 0) - (left.rating ?? 0);
            case 'healthy':
                return right.categories.length - left.categories.length;
            case 'cheap':
            case 'promotions':
            case 'family_combo': {
                const leftHasManyBranches = left.branches.length > 1 ? 1 : 0;
                const rightHasManyBranches = right.branches.length > 1 ? 1 : 0;
                return rightHasManyBranches - leftHasManyBranches;
            }
            default:
                return 0;
        }
    });

    return sorted;
}

function scoreForYouCandidate(restaurant: RestaurantWithBranches, preferenceHints: HomePreferenceHints) {
    const categories = restaurant.categories.map((category) => category.name.toLowerCase());
    const categoryScore = categories.reduce((score, category) => score + (preferenceHints.categoryWeights[category] ?? 0), 0);

    const etaBaseline = preferenceHints.preferredEtaMax ?? ETA_DEFAULT_MINUTES;
    const etaPenalty = Math.abs(estimateEta(restaurant) - etaBaseline);

    const priceBaseline = preferenceHints.preferredPriceMax ?? estimateFinalPrice(restaurant);
    const pricePenalty = Math.abs(estimateFinalPrice(restaurant) - priceBaseline) / 120;

    const ratingBonus = (restaurant.rating ?? 0) * 2;
    return categoryScore + ratingBonus - etaPenalty - pricePenalty;
}

export function dedupeRails(rails: HomeRail[]) {
    const seenRestaurantIds = new Set<string>();

    return rails
        .map((rail) => {
            const dedupedItems = rail.items.filter((restaurant) => {
                if (seenRestaurantIds.has(restaurant.id)) {
                    return false;
                }

                seenRestaurantIds.add(restaurant.id);
                return true;
            });

            return {
                ...rail,
                items: dedupedItems
            };
        })
        .filter((rail) => rail.items.length > 0);
}

export function buildPersonalizedRails(
    orderedRestaurants: RestaurantWithBranches[],
    viewedHistory: ViewedRestaurantSignal[],
    preferenceHints: HomePreferenceHints
) {
    if (viewedHistory.length < PERSONALIZED_MIN_HISTORY) {
        return [] as HomeRail[];
    }

    const restaurantsById = new Map(orderedRestaurants.map((restaurant) => [restaurant.id, restaurant]));

    const recentlyViewedItems = viewedHistory
        .sort((left, right) => right.viewedAt - left.viewedAt)
        .map((entry) => restaurantsById.get(entry.restaurantId))
        .filter((restaurant): restaurant is RestaurantWithBranches => Boolean(restaurant))
        .slice(0, 8);

    const forYouItems = [...orderedRestaurants]
        .sort((left, right) => scoreForYouCandidate(right, preferenceHints) - scoreForYouCandidate(left, preferenceHints))
        .slice(0, 8);

    const rails: HomeRail[] = [];

    if (recentlyViewedItems.length >= PERSONALIZED_MIN_HISTORY) {
        rails.push({
            railId: 'recently-viewed',
            title: 'Vistos recientemente',
            subtitle: 'Retoma restaurantes que revisaste antes',
            items: recentlyViewedItems
        });
    }

    if (forYouItems.length >= PERSONALIZED_MIN_HISTORY) {
        rails.push({
            railId: 'for-you',
            title: 'Para ti',
            subtitle: 'Opciones según tus interacciones recientes',
            items: forYouItems
        });
    }

    return rails;
}

export function useHomeRails({
    restaurants,
    activeIntent,
    filters,
    sortBy,
    personalizedEnabled = false,
    isReturningSession = false,
    viewedHistory = [],
    preferenceHints = { categoryWeights: {} }
}: UseHomeRailsOptions) {
    return useMemo(() => {
        const filtered = applyHomeFilters(restaurants, filters);
        const orderedBySort = sortRestaurants(filtered, sortBy);
        const ordered = sortByIntent(orderedBySort, activeIntent);
        const orderedByValue = [...ordered].sort((left, right) => estimateFinalPrice(left) - estimateFinalPrice(right));
        const orderedByFee = [...ordered].sort((left, right) => estimateDeliveryFee(left) - estimateDeliveryFee(right));
        const orderedByDistance = [...ordered].sort(
            (left, right) => (left.distance ?? Number.MAX_SAFE_INTEGER) - (right.distance ?? Number.MAX_SAFE_INTEGER)
        );
        const orderedByQuality = [...ordered].sort((left, right) => {
            const ratingDelta = (right.rating ?? 0) - (left.rating ?? 0);
            if (ratingDelta !== 0) {
                return ratingDelta;
            }

            return (right.review_count ?? 0) - (left.review_count ?? 0);
        });
        const promoItems = ordered.filter((restaurant) => Boolean(restaurant.promo_text));

        const nearby = ordered.filter((restaurant) => {
            if (restaurant.distance === undefined || restaurant.distance === null) {
                return false;
            }

            return restaurant.distance <= 5;
        });

        const other = ordered.filter((restaurant) => {
            if (restaurant.distance === undefined || restaurant.distance === null) {
                return true;
            }

            return restaurant.distance > 5;
        });

        const coreRails: HomeRail[] = [
            {
            railId: 'promos',
            title: 'Promos',
            subtitle: promoItems.length > 0
                ? 'Ofertas activas que te pueden convenir'
                : 'No hay promos activas ahora, pero aquí tienes opciones recomendadas',
            items: (promoItems.length > 0 ? promoItems : ordered).slice(0, 8)
            },
            {
                railId: 'best-quality',
                title: 'Mejor calidad',
                subtitle: 'Opciones mejor valoradas por clientes',
                items: orderedByQuality.slice(0, 8)
            },
            {
                railId: 'nearest',
                title: 'Cerca de ti',
                subtitle: 'Restaurantes más cerca de tu ubicación',
                items: orderedByDistance.slice(0, 8)
            }
        ];

        const additionalRails: HomeRail[] = [];

        if (personalizedEnabled && isReturningSession) {
            additionalRails.push(...buildPersonalizedRails(ordered, viewedHistory, preferenceHints));
        }

        if (nearby.length > 0) {
            additionalRails.push({
                railId: 'best-value-near-you',
                title: 'Mejor valor cerca de ti',
                subtitle: 'Opciones cercanas para decidir rápido',
                items: nearby
            });
        }

        if (ordered.length > 0) {
            additionalRails.push({
                railId: 'popular-now',
                title: 'Popular ahora',
                subtitle: 'Restaurantes destacados en este momento',
                items: ordered.slice(0, 8)
            });
        }

        const combosUnderBudget = orderedByValue.filter((restaurant) => estimateFinalPrice(restaurant) <= COMBO_BUDGET_CENTS);
        additionalRails.push({
            railId: 'combos-under-budget',
            title: 'Combos bajo tu presupuesto',
            subtitle: 'Selección estimada por precio final total',
            items: combosUnderBudget.slice(0, 8)
        });

        const lowDeliveryFee = orderedByFee.filter((restaurant) => estimateDeliveryFee(restaurant) <= 1000);
        additionalRails.push({
            railId: 'low-delivery-fee',
            title: 'Baja tarifa de envío',
            subtitle: 'Opciones con costo de entrega menor',
            items: (lowDeliveryFee.length > 0 ? lowDeliveryFee : orderedByFee).slice(0, 8)
        });

        additionalRails.push({
            railId: 'continue-exploring',
            title: 'Seguir explorando',
            subtitle: 'Todos los restaurantes disponibles',
            items: other.length > 0 ? other : ordered
        });

        const dedupedAdditionalRails = dedupeRails(additionalRails);

        return [
            ...coreRails,
            ...dedupedAdditionalRails
        ];
    }, [restaurants, activeIntent, filters, sortBy, personalizedEnabled, isReturningSession, viewedHistory, preferenceHints]);
}
