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
                branches!inner (
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
        const branchIds = baseRestaurants
            .flatMap((restaurant) => restaurant.branches || [])
            .map((branch) => branch.id)
            .filter(Boolean);

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

            const activeDeals = ((dealsData || []) as DealRow[])
                .filter((deal) => isDealActiveNow(deal))
                .sort((left, right) => {
                    const leftCreatedAt = left.created_at ? Date.parse(left.created_at) : 0;
                    const rightCreatedAt = right.created_at ? Date.parse(right.created_at) : 0;
                    return rightCreatedAt - leftCreatedAt;
                });

            dealsByBranch = activeDeals.reduce((acc, deal) => {
                if (!acc.has(deal.branch_id)) {
                    acc.set(deal.branch_id, deal);
                }
                return acc;
            }, new Map<string, DealRow>());

            feeByBranch = ((feeRulesData || []) as FeeRuleRow[]).reduce((acc, row) => {
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

            reviewsByBranch = ((branchReviewsData || []) as BranchReviewRow[]).reduce((acc, row) => {
                const rating = toNumber(row.rating);
                if (rating == null) {
                    return acc;
                }

                const previous = acc.get(row.branch_id) || { reviewCount: 0, ratingSum: 0 };
                acc.set(row.branch_id, {
                    reviewCount: previous.reviewCount + 1,
                    ratingSum: previous.ratingSum + rating
                });

                return acc;
            }, new Map<string, { reviewCount: number; ratingSum: number }>());
        }

        // Transform the data to flatten categories and enrich from discovery tables
        let result: TransformedRestaurant[] = baseRestaurants.map((restaurant) => {
            const categories = (restaurant.restaurant_restaurant_categories || [])
                .map((rrc) => rrc.restaurant_categories)
                .filter(Boolean);

            const branchesWithDerivedMetrics = (restaurant.branches || []).map((branch) => {
                const promoText = branch.promo_text || dealsByBranch.get(branch.id)?.title || null;
                const branchFee = feeByBranch.get(branch.id) ?? toNumber(branch.estimated_delivery_fee) ?? null;
                const branchReviewStats = reviewsByBranch.get(branch.id);
                const branchReviewCount = branchReviewStats?.reviewCount ?? 0;
                const branchRating = branchReviewStats && branchReviewCount > 0
                    ? Number((branchReviewStats.ratingSum / branchReviewCount).toFixed(2))
                    : null;

                return {
                    ...branch,
                    rating: branchRating,
                    review_count: branchReviewCount,
                    promo_text: promoText,
                    estimated_delivery_fee: branchFee
                };
            });

            let sumRating = 0;
            let countRating = 0;
            let sumReviewCount = 0;
            let sumEta = 0;
            let countEta = 0;
            let sumPrice = 0;
            let countPrice = 0;
            let sumFee = 0;
            let countFee = 0;
            let derivedPromo: string | null = null;

            for (const branch of branchesWithDerivedMetrics) {
                const bRating = toNumber(branch.rating);
                if (bRating !== null) {
                    sumRating += bRating;
                    countRating++;
                }

                const bReviewCount = toNumber(branch.review_count);
                if (bReviewCount !== null) {
                    sumReviewCount += bReviewCount;
                }

                const bEta = toNumber(branch.eta_min);
                if (bEta !== null) {
                    sumEta += bEta;
                    countEta++;
                }

                const bPrice = toNumber(branch.avg_price_estimate);
                if (bPrice !== null) {
                    sumPrice += bPrice;
                    countPrice++;
                }

                const bFee = toNumber(branch.estimated_delivery_fee);
                if (bFee !== null) {
                    sumFee += bFee;
                    countFee++;
                }

                if (!derivedPromo && branch.promo_text) {
                    derivedPromo = branch.promo_text;
                }
            }

            const derivedRating = countRating > 0 ? Number((sumRating / countRating).toFixed(2)) : null;
            const derivedReviewCount = sumReviewCount;
            const restaurantRating = toNumber(restaurant.rating);
            const restaurantReviewCount = toNumber(restaurant.review_count);
            const resolvedRating = derivedRating ?? restaurantRating;
            const resolvedReviewCount = derivedReviewCount > 0 ? derivedReviewCount : (restaurantReviewCount ?? 0);
            const derivedEta = countEta > 0 ? sumEta / countEta : null;
            const derivedAvgPrice = countPrice > 0 ? sumPrice / countPrice : null;
            const derivedFee = countFee > 0 ? sumFee / countFee : null;

            return {
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
                categories
            };
        });

        // Filter by category if specified
        if (categoryId) {
            result = result.filter((restaurant) =>
                restaurant.categories.some((cat: { id: string }) => cat.id === categoryId)
            );
        }

        // Calculate distance and sort if user location is provided
        if (lat && lng) {
            const userLat = parseFloat(lat);
            const userLng = parseFloat(lng);

            result = result.map((restaurant) => {
                // Get the nearest branch distance
                const branches = (restaurant.branches as Array<{ latitude: number | null; longitude: number | null }>) || [];
                let minDistance = Infinity;

                branches.forEach((branch) => {
                    if (branch.latitude && branch.longitude) {
                        // ⚡ Bolt: Removed redundant local calculateDistance implementation.
                        // Relying on the shared `@/utils/geoUtils` version standardizes Haversine computations,
                        // eliminating duplicate JS functions and math allocations in the app payload.
                        const distance = calculateDistance(
                            userLat,
                            userLng,
                            branch.latitude,
                            branch.longitude
                        );
                        if (distance < minDistance) {
                            minDistance = distance;
                        }
                    }
                });

                return {
                    ...restaurant,
                    distance: minDistance === Infinity ? null : minDistance
                };
            });

            // Sort by distance (nearest first), restaurants without distance go last
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

