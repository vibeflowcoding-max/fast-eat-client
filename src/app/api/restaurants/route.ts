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
    branches: BranchData[];
    categories: CategoryData[];
    distance?: number | null;
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

        // Transform the data to flatten categories
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let result: TransformedRestaurant[] = ((restaurants || []) as unknown as RestaurantData[]).map((restaurant) => {
            const categories = (restaurant.restaurant_restaurant_categories || [])
                .map((rrc) => rrc.restaurant_categories)
                .filter(Boolean);

            return {
                id: restaurant.id,
                name: restaurant.name,
                slug: restaurant.slug,
                logo_url: restaurant.logo_url,
                description: restaurant.description,
                is_active: restaurant.is_active,
                branches: restaurant.branches,
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
