import { Suspense } from 'react';
import { getSupabaseServer } from '@/lib/supabase-server';
import MainApp from '@/components/MainApp';
import LoadingScreen from '@/components/LoadingScreen';

// Force dynamic rendering to avoid build-time Supabase calls
export const dynamic = 'force-dynamic';

type RestaurantBranch = {
    id: string;
    is_active: boolean;
    is_main?: boolean | null;
};

function selectPreferredBranch(branches: RestaurantBranch[]) {
    const activeBranches = branches.filter((branch) => branch.is_active);

    if (activeBranches.length === 0) {
        return null;
    }

    return activeBranches.find((branch) => branch.is_main) || activeBranches[0];
}

// This is a Server Component
export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    const supabase = getSupabaseServer();
    let initialBranchId = undefined;

    try {
        // 1. Try to find a branch directly (Best for specific branch URLs)
        const { data: branches } = await supabase
            .from('branches')
            .select('id, name')
            .eq('is_active', true);

        const branchRows = Array.isArray(branches) ? branches as Array<{ id: string; name: string }> : [];

        if (branchRows.length > 0) {
            const normalizedSlug = slug.toLowerCase();
            const matched = branchRows.find((b) =>
                b.name.toLowerCase().replace(/ /g, '-') === normalizedSlug ||
                b.name.toLowerCase() === normalizedSlug
            );

            if (matched) {
                initialBranchId = matched.id;
            }
        }

        // 2. Fallback: Try to find a restaurant by slug (For main restaurant URLs)
        if (!initialBranchId) {
            const { data: restaurant } = await supabase
                .from('restaurants')
                .select(`
                    id,
                    branches (
                        id,
                        is_active,
                        is_main
                    )
                `)
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            const restaurantRecord = restaurant as { branches?: RestaurantBranch[] } | null;
            const restaurantBranches = Array.isArray(restaurantRecord?.branches)
                ? restaurantRecord.branches
                : [];

            if (restaurant && restaurantBranches.length > 0) {
                const preferredBranch = selectPreferredBranch(restaurantBranches);
                if (preferredBranch) {
                    initialBranchId = preferredBranch.id;
                }
            }
        }
    } catch (error) {
        console.error("Error resolving slug:", error);
    }

    return (
        <Suspense fallback={<LoadingScreen />}>
            <MainApp initialBranchId={initialBranchId} />
        </Suspense>
    );
}

// Generate metadata for SEO (Optional but recommended)
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    // Simple fast metadata without extra DB call if possible, or repeat the call (Next.js dedupes fetch)
    const title = slug.replace(/-/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
    return {
        title: `${title} | Menú Digital`,
        description: `Ordena en línea con ${title}`
    };
}
