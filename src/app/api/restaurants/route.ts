import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { calculateDistance } from '@/utils/geoUtils';

// Force dynamic to avoid build-time Supabase calls
export const dynamic = 'force-dynamic';

interface BranchData {
    id: string;
    name: string;
    address: string | null;
    phone: string | null;
    is_active: boolean;
    latitude: number | null;
    longitude: number | null;
    image_url: string | null;
    city: string | null;
    country: string;
    human_addres: string | null;
    delivery_radius_km: number | null;
    is_accepting_orders: boolean;
    code: string | null;
    rating?: number | null;
    review_count?: number | null;
    eta_min?: number | null;
    avg_price_estimate?: number | null;
    estimated_delivery_fee?: number | null;
    promo_text?: string | null;
}

interface CategoryData {
    id: string;
    name: string;
    description: string | null;
    icon: string;
}

interface RestaurantData {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    is_active: boolean;
    rating: number | null;
    review_count: number | null;
    eta_min: number | null;
    avg_price_estimate: number | null;
    estimated_delivery_fee: number | null;
    promo_text: string | null;
    branches: BranchData[];
    restaurant_restaurant_categories: { restaurant_categories: CategoryData }[];
}

interface TransformedRestaurant {
    id: string;
    name: string;
    slug: string;
    logo_url: string | null;
    description: string | null;
    is_active: boolean;
    rating: number | null;
    review_count: number | null;
    eta_min: number | null;
    avg_price_estimate: number | null;
    estimated_delivery_fee: number | null;
    promo_text: string | null;
    branches: BranchData[];
    categories: CategoryData[];
    distance?: number | null;
}

interface DealRow {
    branch_id: string;
    title: string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string | null;
}

interface FeeRuleRow {
    branch_id: string;
    delivery_fee: number | string;
}

interface BranchReviewRow {
    branch_id: string;
    rating: number | string | null;
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

function isDealActiveNow(deal: Pick<DealRow, 'starts_at' | 'ends_at'>): boolean {
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

export async function GET(request: NextRequest) {
    try {
        const supabaseServer = getSupabaseServer();
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        // Build the query - fetch restaurants with their branches and categories
        const query = supabaseServer
            .from('restaurants')
            .select(`
                id,
                name,
                slug,
                logo_url,
                description,
                is_active,
                rating,
                review_count,
                eta_min,
                avg_price_estimate,
                estimated_delivery_fee,
                promo_text,
                branches!branches_restaurant_id_fkey!inner (
                    id,
                    name,
                    address,
                    phone,
                    is_active,
                    latitude,
                    longitude,
                    image_url,
                    city,
                    country,
                    human_addres,
                    delivery_radius_km,
                    is_accepting_orders,
                    code
                ),
                restaurant_restaurant_categories (
                    category_id,
                    restaurant_categories (
                        id,
                        name,
                        description,
                        icon
                    )
                )
            `)
            .eq('is_active', true)
            .eq('branches.is_active', true);

        const { data: restaurants, error } = await query;

        if (error) {
            console.error('Supabase error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        const baseRestaurants = (restaurants || []) as unknown as RestaurantData[];

        // ⚡ Bolt: Single pass to extract branch ids, skipping restaurants that don't match the category.
        // This prevents N+1 queries for deals/fees/reviews on branches that will just be filtered out anyway.
        const branchIds: string[] = [];
        for (const restaurant of baseRestaurants) {
            if (categoryId) {
                const hasCategory = (restaurant.restaurant_restaurant_categories || []).some(
                    (rrc) => rrc.restaurant_categories?.id === categoryId
                );
                if (!hasCategory) continue;
            }

            if (restaurant.branches) {
                for (const branch of restaurant.branches) {
                    if (branch.id) branchIds.push(branch.id);
                }
            }
        }

        let dealsByBranch = new Map<string, DealRow>();
        let feeByBranch = new Map<string, number>();
        let reviewsByBranch = new Map<string, { reviewCount: number; ratingSum: number }>();

        if (branchIds.length > 0) {
            const [{ data: dealsData, error: dealsError }, { data: feeRulesData, error: feeRulesError }, { data: branchReviewsData, error: branchReviewsError }] = await Promise.all([
                supabaseServer
                    .from('deals')
                    .select('branch_id,title,starts_at,ends_at,created_at')
                    .in('branch_id', branchIds)
                    .eq('active', true),
                supabaseServer
                    .from('fee_rules')
                    .select('branch_id,delivery_fee')
                    .in('branch_id', branchIds)
                    .eq('active', true),
                supabaseServer
                    .from('branch_reviews')
                    .select('branch_id,rating')
                    .in('branch_id', branchIds)
            ]);

            if (dealsError) {
                console.warn('Could not fetch deals for restaurant listing:', dealsError.message);
            }

            if (feeRulesError) {
                console.warn('Could not fetch fee rules for restaurant listing:', feeRulesError.message);
            }

            if (branchReviewsError) {
                console.warn('Could not fetch branch reviews for restaurant listing:', branchReviewsError.message);
            }

            // ⚡ Bolt: Use a single for...of loop over dealsData to avoid chained .filter().sort().reduce()
            // and reduce intermediate array allocations.
            const dealsArr = (dealsData || []) as DealRow[];
            for (const deal of dealsArr) {
                if (!isDealActiveNow(deal)) continue;

                const existing = dealsByBranch.get(deal.branch_id);
                if (!existing) {
                    dealsByBranch.set(deal.branch_id, deal);
                } else {
                    const existingCreatedAt = existing.created_at ? Date.parse(existing.created_at) : 0;
                    const newCreatedAt = deal.created_at ? Date.parse(deal.created_at) : 0;
                    if (newCreatedAt > existingCreatedAt) {
                        dealsByBranch.set(deal.branch_id, deal);
                    }
                }
            }

            // ⚡ Bolt: Single for...of pass over feeRulesData to populate feeByBranch map.
            const feeRulesArr = (feeRulesData || []) as FeeRuleRow[];
            for (const row of feeRulesArr) {
                const deliveryFee = toNumber(row.delivery_fee);
                if (deliveryFee === null) continue;

                const current = feeByBranch.get(row.branch_id);
                if (current === undefined || deliveryFee < current) {
                    feeByBranch.set(row.branch_id, deliveryFee);
                }
            }

            // ⚡ Bolt: Single for...of pass over branchReviewsData to accumulate review metrics.
            const branchReviewsArr = (branchReviewsData || []) as BranchReviewRow[];
            for (const row of branchReviewsArr) {
                const rating = toNumber(row.rating);
                if (rating == null) continue;

                const previous = reviewsByBranch.get(row.branch_id);
                if (previous) {
                    previous.reviewCount += 1;
                    previous.ratingSum += rating;
                } else {
                    reviewsByBranch.set(row.branch_id, {
                        reviewCount: 1,
                        ratingSum: rating
                    });
                }
            }
        }

        const userLat = lat ? parseFloat(lat) : null;
        const userLng = lng ? parseFloat(lng) : null;

        // Transform the data to flatten categories and enrich from discovery tables
        // ⚡ Bolt: Fused the pipeline (.map -> .filter category -> .map distance) into a single for...of loop
        let result: TransformedRestaurant[] = [];

        for (const restaurant of baseRestaurants) {
            let hasMatchingCategory = false;
            const categories: CategoryData[] = [];

            for (const rrc of (restaurant.restaurant_restaurant_categories || [])) {
                if (rrc.restaurant_categories) {
                    categories.push(rrc.restaurant_categories);
                    if (categoryId && rrc.restaurant_categories.id === categoryId) {
                        hasMatchingCategory = true;
                    }
                }
            }

            if (categoryId && !hasMatchingCategory) {
                continue;
            }

            const branchesWithDerivedMetrics: BranchData[] = [];
            let minDistance = Infinity;

            for (const branch of (restaurant.branches || [])) {
                const promoText = branch.promo_text || dealsByBranch.get(branch.id)?.title || null;
                const branchFee = feeByBranch.get(branch.id) ?? toNumber(branch.estimated_delivery_fee) ?? null;
                const branchReviewStats = reviewsByBranch.get(branch.id);
                const branchReviewCount = branchReviewStats?.reviewCount ?? 0;
                const branchRating = branchReviewStats && branchReviewCount > 0
                    ? Number((branchReviewStats.ratingSum / branchReviewCount).toFixed(2))
                    : null;

                branchesWithDerivedMetrics.push({
                    ...branch,
                    rating: branchRating,
                    review_count: branchReviewCount,
                    promo_text: promoText,
                    estimated_delivery_fee: branchFee
                });

                if (userLat !== null && userLng !== null && branch.latitude !== null && branch.longitude !== null) {
                    const distance = calculateDistance(userLat, userLng, branch.latitude, branch.longitude);
                    if (distance < minDistance) {
                        minDistance = distance;
                    }
                }
            }

            let branchRatingSum = 0;
            let branchRatingCount = 0;
            let branchReviewCountSum = 0;
            let branchEtaSum = 0;
            let branchEtaCount = 0;
            let branchAvgPriceSum = 0;
            let branchAvgPriceCount = 0;
            let branchFeeSum = 0;
            let branchFeeCount = 0;
            let derivedPromo: string | null = null;

            for (const branch of branchesWithDerivedMetrics) {
                const bRating = toNumber(branch.rating);
                if (bRating !== null) {
                    branchRatingSum += bRating;
                    branchRatingCount++;
                }

                const bReviewCount = toNumber(branch.review_count);
                if (bReviewCount !== null) {
                    branchReviewCountSum += bReviewCount;
                }

                const bEta = toNumber(branch.eta_min);
                if (bEta !== null) {
                    branchEtaSum += bEta;
                    branchEtaCount++;
                }

                const bAvgPrice = toNumber(branch.avg_price_estimate);
                if (bAvgPrice !== null) {
                    branchAvgPriceSum += bAvgPrice;
                    branchAvgPriceCount++;
                }

                const bFee = toNumber(branch.estimated_delivery_fee);
                if (bFee !== null) {
                    branchFeeSum += bFee;
                    branchFeeCount++;
                }

                if (!derivedPromo && branch.promo_text) {
                    derivedPromo = branch.promo_text;
                }
            }

            const derivedRating = branchRatingCount > 0 ? Number((branchRatingSum / branchRatingCount).toFixed(2)) : null;
            const derivedReviewCount = branchReviewCountSum;
            const restaurantRating = toNumber(restaurant.rating);
            const restaurantReviewCount = toNumber(restaurant.review_count);
            const resolvedRating = derivedRating ?? restaurantRating;
            const resolvedReviewCount = derivedReviewCount > 0 ? derivedReviewCount : (restaurantReviewCount ?? 0);
            const derivedEta = branchEtaCount > 0 ? branchEtaSum / branchEtaCount : null;
            const derivedAvgPrice = branchAvgPriceCount > 0 ? branchAvgPriceSum / branchAvgPriceCount : null;
            const derivedFee = branchFeeCount > 0 ? branchFeeSum / branchFeeCount : null;

            result.push({
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                logo_url: restaurant.logo_url,
                description: restaurant.description,
                is_active: restaurant.is_active,
                rating: resolvedRating,
                review_count: Math.max(0, resolvedReviewCount),
                eta_min: restaurant.eta_min ?? (derivedEta !== null ? Math.round(derivedEta) : null),
                avg_price_estimate: restaurant.avg_price_estimate ?? (derivedAvgPrice !== null ? Math.round(derivedAvgPrice) : null),
                estimated_delivery_fee: derivedFee !== null
                    ? Math.round(derivedFee)
                    : (toNumber(restaurant.estimated_delivery_fee) ?? null),
                promo_text: restaurant.promo_text ?? derivedPromo,
                branches: branchesWithDerivedMetrics,
                categories,
                ...(minDistance !== Infinity ? { distance: minDistance } : { distance: null })
            });
        }

        // Sort by distance (nearest first) if location was provided
        if (userLat !== null && userLng !== null) {
            result.sort((a, b) => {
                if (a.distance === null && b.distance === null) return 0;
                if (a.distance === null) return 1;
                if (b.distance === null) return -1;
                return a.distance - b.distance;
            });
        }

        return NextResponse.json(result);
    } catch (err) {
        console.error('Error fetching restaurants:', err);
        return NextResponse.json({ error: 'Failed to fetch restaurants' }, { status: 500 });
    }
}

