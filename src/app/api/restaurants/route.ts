import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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
    service_fee: number | string;
    platform_fee: number | string;
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

function average(values: Array<number | null | undefined>): number | null {
    const normalized = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
    if (normalized.length === 0) {
        return null;
    }

    return normalized.reduce((sum, value) => sum + value, 0) / normalized.length;
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
        const { searchParams } = new URL(request.url);
        const categoryId = searchParams.get('categoryId');
        const lat = searchParams.get('lat');
        const lng = searchParams.get('lng');

        // Build the query - fetch restaurants with their branches and categories
        const query = supabase
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

        if (branchIds.length > 0) {
            const [{ data: dealsData }, { data: feeRulesData }] = await Promise.all([
                supabase
                    .from('deals')
                    .select('branch_id,title,starts_at,ends_at,created_at')
                    .in('branch_id', branchIds)
                    .eq('active', true),
                supabase
                    .from('fee_rules')
                    .select('branch_id,delivery_fee,service_fee,platform_fee')
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

            dealsByBranch = activeDeals.reduce((acc, deal) => {
                if (!acc.has(deal.branch_id)) {
                    acc.set(deal.branch_id, deal);
                }
                return acc;
            }, new Map<string, DealRow>());

            feeByBranch = ((feeRulesData || []) as FeeRuleRow[]).reduce((acc, row) => {
                const deliveryFee = toNumber(row.delivery_fee) ?? 0;
                const serviceFee = toNumber(row.service_fee) ?? 0;
                const platformFee = toNumber(row.platform_fee) ?? 0;
                const totalFee = deliveryFee + serviceFee + platformFee;

                const current = acc.get(row.branch_id);
                if (current === undefined || totalFee < current) {
                    acc.set(row.branch_id, totalFee);
                }

                return acc;
            }, new Map<string, number>());
        }

        // Transform the data to flatten categories and enrich from discovery tables
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: TransformedRestaurant[] = baseRestaurants.map((restaurant) => {
            const categories = (restaurant.restaurant_restaurant_categories || [])
                .map((rrc) => rrc.restaurant_categories)
                .filter(Boolean);

            const branchesWithDerivedMetrics = (restaurant.branches || []).map((branch) => {
                const promoText = branch.promo_text || dealsByBranch.get(branch.id)?.title || null;
                const branchFee = toNumber(branch.estimated_delivery_fee) ?? feeByBranch.get(branch.id) ?? null;

                return {
                    ...branch,
                    promo_text: promoText,
                    estimated_delivery_fee: branchFee
                };
            });

            const branchRatings = branchesWithDerivedMetrics.map((branch) => toNumber(branch.rating));
            const branchReviewCounts = branchesWithDerivedMetrics.map((branch) => toNumber(branch.review_count));
            const branchEta = branchesWithDerivedMetrics.map((branch) => toNumber(branch.eta_min));
            const branchAvgPrice = branchesWithDerivedMetrics.map((branch) => toNumber(branch.avg_price_estimate));
            const branchFees = branchesWithDerivedMetrics.map((branch) => toNumber(branch.estimated_delivery_fee));

            const derivedRating = average(branchRatings);
            const derivedReviewCount = branchReviewCounts
                .filter((value): value is number => typeof value === 'number' && Number.isFinite(value))
                .reduce((sum, value) => sum + value, 0);
            const derivedEta = average(branchEta);
            const derivedAvgPrice = average(branchAvgPrice);
            const derivedFee = average(branchFees);
            const derivedPromo = branchesWithDerivedMetrics.find((branch) => branch.promo_text)?.promo_text ?? null;

            return {
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                logo_url: restaurant.logo_url,
                description: restaurant.description,
                is_active: restaurant.is_active,
                rating: restaurant.rating ?? derivedRating,
                review_count: restaurant.review_count ?? (derivedReviewCount > 0 ? derivedReviewCount : null),
                eta_min: restaurant.eta_min ?? (derivedEta !== null ? Math.round(derivedEta) : null),
                avg_price_estimate: restaurant.avg_price_estimate ?? (derivedAvgPrice !== null ? Math.round(derivedAvgPrice) : null),
                estimated_delivery_fee: restaurant.estimated_delivery_fee ?? (derivedFee !== null ? Math.round(derivedFee) : null),
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

// Haversine formula for distance calculation
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg: number): number {
    return deg * (Math.PI / 180);
}
