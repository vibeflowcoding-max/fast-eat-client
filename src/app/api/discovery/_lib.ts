import { supabase } from '@/lib/supabase';
import { DiscoveryIntent, LocationContext, RecommendationItem, UserConstraints } from '@/features/home-discovery/types';

interface BranchRow {
    id: string;
    name: string;
    latitude: number | null;
    longitude: number | null;
    delivery_radius_km: number | null;
    rating?: number | null;
    review_count?: number | null;
    eta_min?: number | null;
    avg_price_estimate?: number | null;
    estimated_delivery_fee?: number | null;
    promo_text?: string | null;
}

interface RestaurantRow {
    id: string;
    name: string;
    slug: string;
    description: string | null;
    logo_url: string | null;
    is_active: boolean;
    rating?: number | null;
    review_count?: number | null;
    eta_min?: number | null;
    avg_price_estimate?: number | null;
    estimated_delivery_fee?: number | null;
    promo_text?: string | null;
    promo_discount_type?: 'percentage' | 'fixed' | null;
    promo_discount_value?: number | null;
    branches: BranchRow[];
    restaurant_restaurant_categories: Array<{
        restaurant_categories:
        | {
            id: string;
            name: string;
        }
        | Array<{
            id: string;
            name: string;
        }>
        | null;
    }>;
}

interface CachedRecommendations {
    payload: {
        rails: Array<{
            railId: string;
            title: string;
            subtitle?: string;
            items: RecommendationItem[];
        }>;
        generatedAt: string;
        strategyVersion: string;
    };
    expiresAt: number;
}

const STRATEGY_VERSION = 'discovery-v1.0.0';
const CACHE_TTL_MS = 90_000;

interface RankingWeights {
    intentRelevance: number;
    distance: number;
    valueScore: number;
    etaScore: number;
    rating: number;
    promoStrength: number;
}

const DEFAULT_RANKING_WEIGHTS: RankingWeights = {
    intentRelevance: 0.25,
    distance: 0.2,
    valueScore: 0.2,
    etaScore: 0.15,
    rating: 0.1,
    promoStrength: 0.1
};

const MIN_CONFIDENCE_THRESHOLD = Number(process.env.DISCOVERY_MIN_CONFIDENCE ?? 0.35);
const MIN_SCORE_THRESHOLD = Number(process.env.DISCOVERY_MIN_SCORE ?? 0.3);

const recommendationsCache = new Map<string, CachedRecommendations>();

interface DealRow {
    branch_id: string;
    title: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number | string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string | null;
}

interface FeeRuleRow {
    branch_id: string;
    delivery_fee: number | string;
}

function nowIso() {
    return new Date().toISOString();
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function average(values: Array<number | null | undefined>) {
    const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (normalized.length === 0) {
        return null;
    }

    return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
}

function isDealActiveNow(deal: Pick<DealRow, 'starts_at' | 'ends_at'>) {
    const now = Date.now();
    const startsAt = deal.starts_at ? Date.parse(deal.starts_at) : null;
    const endsAt = deal.ends_at ? Date.parse(deal.ends_at) : null;

    if (startsAt && Number.isFinite(startsAt) && startsAt > now) {
        return false;
    }

    if (endsAt && Number.isFinite(endsAt) && endsAt < now) {
        return false;
    }

    return true;
}

function toRad(deg: number) {
    return deg * (Math.PI / 180);
}

function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
    const earthRadiusKm = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return earthRadiusKm * c;
}

function estimateBasePrice(intent?: DiscoveryIntent) {
    switch (intent) {
        case 'cheap':
            return 3500;
        case 'family_combo':
            return 9000;
        case 'healthy':
            return 5200;
        case 'promotions':
            return 4200;
        default:
            return 5000;
    }
}

function estimateDiscount(intent?: DiscoveryIntent) {
    switch (intent) {
        case 'promotions':
            return 1200;
        case 'cheap':
            return 700;
        case 'family_combo':
            return 900;
        default:
            return 450;
    }
}

function estimateEta(distanceKm: number | null, intent?: DiscoveryIntent) {
    if (intent === 'fast') {
        return distanceKm !== null ? Math.max(15, Math.round(15 + distanceKm * 2)) : 24;
    }

    return distanceKm !== null ? Math.max(20, Math.round(20 + distanceKm * 3)) : 28;
}

function estimateRating(restaurantId: string) {
    const hash = restaurantId.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    return 3.6 + (hash % 15) / 10;
}

function getRankingWeights(): RankingWeights {
    const envWeights = {
        intentRelevance: Number(process.env.DISCOVERY_WEIGHT_INTENT_RELEVANCE),
        distance: Number(process.env.DISCOVERY_WEIGHT_DISTANCE),
        valueScore: Number(process.env.DISCOVERY_WEIGHT_VALUE),
        etaScore: Number(process.env.DISCOVERY_WEIGHT_ETA),
        rating: Number(process.env.DISCOVERY_WEIGHT_RATING),
        promoStrength: Number(process.env.DISCOVERY_WEIGHT_PROMO)
    };

    return {
        intentRelevance: Number.isFinite(envWeights.intentRelevance) ? envWeights.intentRelevance : DEFAULT_RANKING_WEIGHTS.intentRelevance,
        distance: Number.isFinite(envWeights.distance) ? envWeights.distance : DEFAULT_RANKING_WEIGHTS.distance,
        valueScore: Number.isFinite(envWeights.valueScore) ? envWeights.valueScore : DEFAULT_RANKING_WEIGHTS.valueScore,
        etaScore: Number.isFinite(envWeights.etaScore) ? envWeights.etaScore : DEFAULT_RANKING_WEIGHTS.etaScore,
        rating: Number.isFinite(envWeights.rating) ? envWeights.rating : DEFAULT_RANKING_WEIGHTS.rating,
        promoStrength: Number.isFinite(envWeights.promoStrength) ? envWeights.promoStrength : DEFAULT_RANKING_WEIGHTS.promoStrength
    };
}

function normalize(value: number, min: number, max: number) {
    if (max === min) {
        return 0;
    }

    return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

function getIntentRelevance(intent: DiscoveryIntent | undefined, input: { finalPrice: number; etaMin: number; discountAmount: number; rating: number }) {
    if (!intent) {
        return 0.6;
    }

    switch (intent) {
        case 'cheap':
            return Math.max(0, 1 - input.finalPrice / 14000);
        case 'fast':
            return Math.max(0, 1 - input.etaMin / 55);
        case 'promotions':
            return normalize(input.discountAmount, 0, 1800);
        case 'best_rated':
            return normalize(input.rating, 3.5, 5);
        case 'family_combo':
            return Math.max(0, 1 - input.finalPrice / 20000);
        case 'healthy':
            return 0.7;
        default:
            return 0.6;
    }
}

function getConfidenceScore(input: {
    distanceKm: number | null;
    finalPrice: number;
    etaMin: number;
    hasCategoryTags: boolean;
}) {
    const distanceConfidence = input.distanceKm !== null ? 0.35 : 0.15;
    const priceConfidence = input.finalPrice > 0 ? 0.25 : 0;
    const etaConfidence = input.etaMin > 0 ? 0.25 : 0;
    const tagConfidence = input.hasCategoryTags ? 0.15 : 0.05;
    return Math.min(1, distanceConfidence + priceConfidence + etaConfidence + tagConfidence);
}

function scoreForIntent(input: {
    intent?: DiscoveryIntent;
    distanceKm: number | null;
    finalPrice: number;
    etaMin: number;
    hasManyBranches: boolean;
    discountAmount: number;
    rating: number;
    weights: RankingWeights;
}) {
    const intentRelevance = getIntentRelevance(input.intent, {
        finalPrice: input.finalPrice,
        etaMin: input.etaMin,
        discountAmount: input.discountAmount,
        rating: input.rating
    });
    const distanceScore = input.distanceKm !== null ? Math.max(0, 1 - input.distanceKm / 10) : 0.35;
    const valueScore = Math.max(0, 1 - input.finalPrice / 15000);
    const etaScore = Math.max(0, 1 - input.etaMin / 60);
    const ratingScore = normalize(input.rating, 3.5, 5);
    const promoStrength = normalize(input.discountAmount, 0, 2000);
    const branchScore = input.hasManyBranches ? 0.05 : 0;

    return (
        input.weights.intentRelevance * intentRelevance +
        input.weights.distance * distanceScore +
        input.weights.valueScore * valueScore +
        input.weights.etaScore * etaScore +
        input.weights.rating * ratingScore +
        input.weights.promoStrength * promoStrength +
        branchScore
    );
}

function getReasonTags(intent: DiscoveryIntent | undefined, distanceKm: number | null, finalPrice: number, etaMin: number, rating: number, confidenceScore: number) {
    const reasons: string[] = [];

    if (intent === 'cheap' || intent === 'promotions') {
        reasons.push('Buen precio final para tu búsqueda');
    }

    if (intent === 'fast') {
        reasons.push('Entrega rápida estimada');
    }

    if (distanceKm !== null && distanceKm <= 4) {
        reasons.push('Cerca de tu ubicación');
    }

    if (finalPrice <= 5000) {
        reasons.push('Ticket accesible');
    }

    if (etaMin <= 24) {
        reasons.push('Tiempo de entrega competitivo');
    }

    if (rating >= 4.4) {
        reasons.push('Alta valoración estimada');
    }

    if (confidenceScore < MIN_CONFIDENCE_THRESHOLD) {
        reasons.push('Estimación basada en datos parciales');
    }

    if (reasons.length === 0) {
        reasons.push('Coincide con tu intención de búsqueda');
    }

    return reasons;
}

export function getTraceId(existing?: string | null) {
    if (existing && existing.trim()) {
        return existing;
    }

    return `trace-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function inferIntentFromQuery(query: string): DiscoveryIntent | undefined {
    const normalized = query.toLowerCase();

    if (/(barato|econ[oó]mico|ahorro|promo|descuento)/.test(normalized)) return 'cheap';
    if (/(r[aá]pido|urgente|ya|express)/.test(normalized)) return 'fast';
    if (/(familiar|familia|combo)/.test(normalized)) return 'family_combo';
    if (/(saludable|fit|healthy)/.test(normalized)) return 'healthy';
    if (/(promoci[oó]n|oferta|deal)/.test(normalized)) return 'promotions';

    return undefined;
}

export function isObject(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

export function isLocationContext(value: unknown): value is LocationContext {
    if (!isObject(value)) return false;

    const latValid = value.lat === undefined || typeof value.lat === 'number';
    const lngValid = value.lng === undefined || typeof value.lng === 'number';

    return latValid && lngValid;
}

export function isConstraints(value: unknown): value is UserConstraints {
    if (!isObject(value)) return false;

    const budgetValid = value.budgetMax === undefined || typeof value.budgetMax === 'number';
    const etaValid = value.etaMaxMinutes === undefined || typeof value.etaMaxMinutes === 'number';

    return budgetValid && etaValid;
}

export function isRecommendationItem(value: unknown): value is RecommendationItem {
    if (!isObject(value)) return false;

    const reasonsValid = Array.isArray(value.reasons) && value.reasons.every((reason) => typeof reason === 'string');
    const kindValid = value.kind === 'restaurant' || value.kind === 'combo' || value.kind === 'dish' || value.kind === 'deal';

    return (
        kindValid &&
        typeof value.id === 'string' &&
        typeof value.restaurantId === 'string' &&
        typeof value.title === 'string' &&
        typeof value.score === 'number' &&
        reasonsValid
    );
}

export function isCompareOption(value: unknown): value is {
    restaurantId: string;
    label: string;
    basePrice: number;
    deliveryFee: number;
    platformFee: number;
    discount: number;
    finalPrice: number;
    etaMin?: number;
} {
    if (!isObject(value)) return false;

    const etaValid = value.etaMin === undefined || typeof value.etaMin === 'number';

    return (
        typeof value.restaurantId === 'string' &&
        typeof value.label === 'string' &&
        typeof value.basePrice === 'number' &&
        typeof value.deliveryFee === 'number' &&
        typeof value.platformFee === 'number' &&
        typeof value.discount === 'number' &&
        typeof value.finalPrice === 'number' &&
        etaValid
    );
}

export function isDiscoveryChatResponseShape(value: unknown): value is {
    answer: string;
    recommendations: RecommendationItem[];
    followUps: string[];
    compareOptions?: { title: string; options: ReturnType<typeof sanitizeCompareOptions> };
    traceId: string;
} {
    if (!isObject(value)) return false;

    const recommendationsValid = Array.isArray(value.recommendations) && value.recommendations.every(isRecommendationItem);
    const followUpsValid = Array.isArray(value.followUps) && value.followUps.every((followUp) => typeof followUp === 'string');
    const compareOptionsValid =
        value.compareOptions === undefined ||
        (
            isObject(value.compareOptions) &&
            typeof value.compareOptions.title === 'string' &&
            Array.isArray(value.compareOptions.options) &&
            value.compareOptions.options.every(isCompareOption)
        );

    return (
        typeof value.answer === 'string' &&
        typeof value.traceId === 'string' &&
        recommendationsValid &&
        followUpsValid &&
        compareOptionsValid
    );
}

export function isDiscoveryRecommendationsResponseShape(value: unknown): value is {
    rails: Array<{ railId: string; title: string; subtitle?: string; items: RecommendationItem[] }>;
    generatedAt: string;
    strategyVersion: string;
} {
    if (!isObject(value)) return false;

    const railsValid =
        Array.isArray(value.rails) &&
        value.rails.every((rail) =>
            isObject(rail) &&
            typeof rail.railId === 'string' &&
            typeof rail.title === 'string' &&
            (rail.subtitle === undefined || typeof rail.subtitle === 'string') &&
            Array.isArray(rail.items) &&
            rail.items.every(isRecommendationItem)
        );

    return railsValid && typeof value.generatedAt === 'string' && typeof value.strategyVersion === 'string';
}

export function isDiscoveryCompareResponseShape(value: unknown): value is {
    comparison: { title: string; options: Array<ReturnType<typeof sanitizeCompareOptions>[number]> };
    traceId: string;
    strategyVersion: string;
} {
    if (!isObject(value)) return false;
    if (!isObject(value.comparison)) return false;

    return (
        typeof value.comparison.title === 'string' &&
        Array.isArray(value.comparison.options) &&
        value.comparison.options.every(isCompareOption) &&
        typeof value.traceId === 'string' &&
        typeof value.strategyVersion === 'string'
    );
}

export function sanitizeCompareOptions(options: unknown): Array<{
    restaurantId: string;
    label: string;
    basePrice: number;
    deliveryFee: number;
    platformFee: number;
    discount: number;
    finalPrice: number;
    etaMin?: number;
}> {
    if (!Array.isArray(options)) {
        return [];
    }

    return options.filter(isCompareOption);
}

export async function getRestaurantRows() {
    const { data, error } = await supabase
        .from('restaurants')
        .select(`
            id,
            name,
            slug,
            description,
            logo_url,
            is_active,
            rating,
            review_count,
            eta_min,
            avg_price_estimate,
            estimated_delivery_fee,
            promo_text,
            branches!inner (
                id,
                name,
                latitude,
                longitude,
                delivery_radius_km,
                rating,
                review_count,
                eta_min,
                avg_price_estimate,
                estimated_delivery_fee,
                promo_text
            ),
            restaurant_restaurant_categories (
                restaurant_categories (
                    id,
                    name
                )
            )
        `)
        .eq('is_active', true)
        .eq('branches.is_active', true)
        .limit(30);

    if (error) {
        throw new Error(error.message);
    }

    const restaurants = ((data ?? []) as unknown as RestaurantRow[]);
    const branchIds = restaurants
        .flatMap((restaurant) => restaurant.branches || [])
        .map((branch) => branch.id)
        .filter(Boolean);

    if (branchIds.length === 0) {
        return restaurants;
    }

    const [{ data: dealsData }, { data: feeRulesData }] = await Promise.all([
        supabase
            .from('deals')
            .select('branch_id,title,discount_type,discount_value,starts_at,ends_at,created_at')
            .in('branch_id', branchIds)
            .eq('active', true),
        supabase
            .from('fee_rules')
            .select('branch_id,delivery_fee')
            .in('branch_id', branchIds)
            .eq('active', true)
    ]);

    const activeDeals = ((dealsData || []) as DealRow[])
        .filter((deal) => isDealActiveNow(deal))
        .sort((left, right) => {
            const leftCreatedAt = left.created_at ? Date.parse(left.created_at) : 0;
            const rightCreatedAt = right.created_at ? Date.parse(right.created_at) : 0;
            return rightCreatedAt - leftCreatedAt;
        });

    const dealsByBranch = activeDeals.reduce((acc, deal) => {
        if (!acc.has(deal.branch_id)) {
            acc.set(deal.branch_id, deal);
        }
        return acc;
    }, new Map<string, DealRow>());

    const feeByBranch = ((feeRulesData || []) as FeeRuleRow[]).reduce((acc, row) => {
        const deliveryFee = toNumber(row.delivery_fee);
        if (deliveryFee === null) {
            return acc;
        }

        const current = acc.get(row.branch_id);
        if (current === undefined || deliveryFee < current) {
            acc.set(row.branch_id, deliveryFee);
        }

        return acc;
    }, new Map<string, number>());

    return restaurants.map((restaurant) => {
        const branches = (restaurant.branches || []).map((branch) => {
            const deal = dealsByBranch.get(branch.id);
            const feeFromRule = feeByBranch.get(branch.id);

            return {
                ...branch,
                promo_text: branch.promo_text ?? deal?.title ?? null,
                estimated_delivery_fee: feeFromRule ?? branch.estimated_delivery_fee ?? null
            };
        });

        const rating = restaurant.rating ?? average(branches.map((branch) => toNumber(branch.rating)));
        const reviewCount = restaurant.review_count ?? branches
            .map((branch) => toNumber(branch.review_count))
            .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
            .reduce((sum, value) => sum + value, 0);
        const etaMinAvg = restaurant.eta_min ?? average(branches.map((branch) => toNumber(branch.eta_min)));
        const avgPriceEstimate = restaurant.avg_price_estimate ?? average(branches.map((branch) => toNumber(branch.avg_price_estimate)));
        const estimatedDeliveryFee = average(branches.map((branch) => toNumber(branch.estimated_delivery_fee)))
            ?? toNumber(restaurant.estimated_delivery_fee);

        const firstPromoBranch = branches.find((branch) => Boolean(branch.promo_text));
        const promoDeal = firstPromoBranch ? dealsByBranch.get(firstPromoBranch.id) : undefined;

        return {
            ...restaurant,
            branches,
            rating: rating ?? null,
            review_count: reviewCount > 0 ? reviewCount : null,
            eta_min: etaMinAvg !== null ? Math.round(etaMinAvg) : null,
            avg_price_estimate: avgPriceEstimate !== null ? Math.round(avgPriceEstimate) : null,
            estimated_delivery_fee: estimatedDeliveryFee !== null ? Math.round(estimatedDeliveryFee) : null,
            promo_text: restaurant.promo_text ?? firstPromoBranch?.promo_text ?? null,
            promo_discount_type: promoDeal?.discount_type ?? null,
            promo_discount_value: toNumber(promoDeal?.discount_value) ?? null
        };
    });
}

export function buildRecommendationItems(params: {
    restaurants: RestaurantRow[];
    intent?: DiscoveryIntent;
    location?: LocationContext;
    constraints?: UserConstraints;
    limit?: number;
}) {
    const basePriceSeed = estimateBasePrice(params.intent);
    const discountSeed = estimateDiscount(params.intent);
    const rankingWeights = getRankingWeights();

    const recommendations = params.restaurants.map((restaurant, index) => {
        const firstBranch = restaurant.branches[0];

        let distanceKm: number | null = null;
        if (
            params.location?.lat !== undefined &&
            params.location?.lng !== undefined &&
            firstBranch?.latitude !== null &&
            firstBranch?.longitude !== null
        ) {
            distanceKm = calculateDistanceKm(
                params.location.lat,
                params.location.lng,
                firstBranch.latitude,
                firstBranch.longitude
            );
        }

        const basePrice = toNumber(restaurant.avg_price_estimate) ?? (basePriceSeed + index * 250);
        const deliveryFee = toNumber(restaurant.estimated_delivery_fee)
            ?? (distanceKm !== null ? Math.max(300, Math.round(distanceKm * 180)) : 650);
        let discountAmount = 0;

        if (restaurant.promo_discount_type === 'percentage' && typeof restaurant.promo_discount_value === 'number') {
            discountAmount = Math.round(basePrice * (restaurant.promo_discount_value / 100));
        } else if (restaurant.promo_discount_type === 'fixed' && typeof restaurant.promo_discount_value === 'number') {
            discountAmount = Math.round(restaurant.promo_discount_value);
        } else if (restaurant.promo_text) {
            discountAmount = Math.max(0, discountSeed - index * 80);
        }

        const finalPrice = basePrice + deliveryFee - discountAmount;
        const etaMin = toNumber(restaurant.eta_min) ?? estimateEta(distanceKm, params.intent);
        const rating = toNumber(restaurant.rating) ?? estimateRating(restaurant.id);
        const categoryTags = (restaurant.restaurant_restaurant_categories ?? [])
            .flatMap((categoryRow) => {
                const categories = categoryRow.restaurant_categories;

                if (!categories) {
                    return [];
                }

                if (Array.isArray(categories)) {
                    return categories.map((category) => category.name);
                }

                return [categories.name];
            })
            .filter(Boolean);

        const confidenceScore = getConfidenceScore({
            distanceKm,
            finalPrice,
            etaMin,
            hasCategoryTags: categoryTags.length > 0
        });

        return {
            kind: 'restaurant' as const,
            id: `rec-${restaurant.id}`,
            restaurantId: restaurant.id,
            title: restaurant.name,
            subtitle: restaurant.description ?? undefined,
            basePrice,
            discountAmount,
            finalPrice,
            estimatedDeliveryFee: deliveryFee,
            etaMin,
            score: scoreForIntent({
                intent: params.intent,
                distanceKm,
                finalPrice,
                etaMin,
                hasManyBranches: restaurant.branches.length > 1,
                discountAmount,
                rating,
                weights: rankingWeights
            }),
            reasons: getReasonTags(params.intent, distanceKm, finalPrice, etaMin, rating, confidenceScore),
            tags: categoryTags,
            confidenceScore,
            openStatusScore: restaurant.is_active ? 1 : 0,
            freshnessScore: Math.max(0, 1 - index / Math.max(1, params.restaurants.length))
        };
    });

    const filtered = recommendations.filter((recommendation) => {
        const budgetValid = params.constraints?.budgetMax === undefined || (recommendation.finalPrice ?? 0) <= params.constraints.budgetMax;
        const etaValid = params.constraints?.etaMaxMinutes === undefined || (recommendation.etaMin ?? 999) <= params.constraints.etaMaxMinutes;
        const dietaryValid = !params.constraints?.dietary?.length || (recommendation.tags ?? []).length > 0;
        const cuisineValid = !params.constraints?.cuisines?.length ||
            params.constraints.cuisines.some((cuisine) =>
                (recommendation.tags ?? []).some((tag) => tag.toLowerCase().includes(cuisine.toLowerCase()))
            );

        return budgetValid && etaValid && dietaryValid && cuisineValid;
    });

    const sorted = filtered
        .sort((left, right) => {
            if (right.score !== left.score) {
                return right.score - left.score;
            }

            if ((right.openStatusScore ?? 0) !== (left.openStatusScore ?? 0)) {
                return (right.openStatusScore ?? 0) - (left.openStatusScore ?? 0);
            }

            if ((right.confidenceScore ?? 0) !== (left.confidenceScore ?? 0)) {
                return (right.confidenceScore ?? 0) - (left.confidenceScore ?? 0);
            }

            if ((right.freshnessScore ?? 0) !== (left.freshnessScore ?? 0)) {
                return (right.freshnessScore ?? 0) - (left.freshnessScore ?? 0);
            }

            return left.title.localeCompare(right.title);
        });

    const candidate = sorted.filter((item) => (item.confidenceScore ?? 0) >= MIN_CONFIDENCE_THRESHOLD && item.score >= MIN_SCORE_THRESHOLD);
    const fallback = sorted
        .sort((left, right) => {
            const leftDistance = left.estimatedDeliveryFee ?? Number.MAX_SAFE_INTEGER;
            const rightDistance = right.estimatedDeliveryFee ?? Number.MAX_SAFE_INTEGER;
            if (leftDistance !== rightDistance) {
                return leftDistance - rightDistance;
            }

            return (left.finalPrice ?? Number.MAX_SAFE_INTEGER) - (right.finalPrice ?? Number.MAX_SAFE_INTEGER);
        });

    return (candidate.length > 0 ? candidate : fallback)
        .slice(0, params.limit ?? 12)
        .map((item) => {
            const { confidenceScore, openStatusScore, freshnessScore, ...rest } = item;
            return rest;
        });
}

export function buildRecommendationRails(items: RecommendationItem[]) {
    const byValue = [...items].sort((a, b) => (a.finalPrice ?? 0) - (b.finalPrice ?? 0));
    const byEta = [...items].sort((a, b) => (a.etaMin ?? 99) - (b.etaMin ?? 99));

    return [
        {
            railId: 'best-value-near-you',
            title: 'Best value near you',
            subtitle: 'Final price + delivery optimized',
            items: byValue.slice(0, 8)
        },
        {
            railId: 'popular-now',
            title: 'Popular now',
            subtitle: 'Highest ranked recommendations',
            items: items.slice(0, 8)
        },
        {
            railId: 'low-delivery-fee',
            title: 'Low delivery fee',
            subtitle: 'Lowest shipping impact first',
            items: byEta.slice(0, 8)
        }
    ];
}

export function getCachedRecommendations(cacheKey: string) {
    const cached = recommendationsCache.get(cacheKey);

    if (!cached) {
        return null;
    }

    if (cached.expiresAt < Date.now()) {
        recommendationsCache.delete(cacheKey);
        return null;
    }

    return cached.payload;
}

export function setCachedRecommendations(
    cacheKey: string,
    payload: {
        rails: Array<{
            railId: string;
            title: string;
            subtitle?: string;
            items: RecommendationItem[];
        }>;
        generatedAt: string;
        strategyVersion: string;
    }
) {
    recommendationsCache.set(cacheKey, {
        payload,
        expiresAt: Date.now() + CACHE_TTL_MS
    });
}

export function getStrategyVersion() {
    return STRATEGY_VERSION;
}

export function getGeneratedAt() {
    return nowIso();
}
