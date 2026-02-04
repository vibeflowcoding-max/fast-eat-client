import { Suspense } from 'react';
import { supabase } from '@/lib/supabase';
import MainApp from '@/components/MainApp';
import LoadingScreen from '@/components/LoadingScreen';

// This is a Server Component
export default async function BranchPage({ params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params;
    let initialBranchId = undefined;

    try {
        // Fetch all active branches to find a match
        // Note: For valid slugs, we expect a match.
        // We fetch all because we need to implement the detailed matching logic
        // (lowercase, replace spaces, etc) which is safer on a small dataset than complex SQL regex.
        // If dataset grows large, we should add a 'slug' column to the DB.
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
