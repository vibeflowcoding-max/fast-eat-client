import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MainApp from '@/components/MainApp';
import LoadingScreen from '@/components/LoadingScreen';

// Force dynamic rendering to avoid build-time Supabase calls
export const dynamic = 'force-dynamic';

// This is a Server Component
export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    let initialBranchId = undefined;

    try {
        // 1. Try to find a branch directly (Best for specific branch URLs)
        const { data: branches } = await supabase
            .from('branches')
            .select('id, name')
            .eq('is_active', true);

        if (branches) {
            const normalizedSlug = slug.toLowerCase();
            const matched = branches.find(b =>
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
                        is_active
                    )
                `)
                .eq('slug', slug)
                .eq('is_active', true)
                .single();

            if (restaurant && restaurant.branches && restaurant.branches.length > 0) {
                // Find method finds the first one that satisfies the condition
                const activeBranch = restaurant.branches.find((b: any) => b.is_active);
                if (activeBranch) {
                    initialBranchId = activeBranch.id;
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
