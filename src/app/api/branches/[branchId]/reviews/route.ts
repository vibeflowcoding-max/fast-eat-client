import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function parseLimit(rawLimit: string | null): number {
  const parsed = rawLimit ? Number(rawLimit) : 6;
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 6;
  }

  return Math.min(20, Math.floor(parsed));
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return null;
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ branchId: string }> }
) {
  try {
    const { branchId } = await context.params;
    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const limit = parseLimit(request.nextUrl.searchParams.get('limit'));
    const supabaseServer = getSupabaseServer();

    const { data: currentBranch, error: branchError } = await (supabaseServer as any)
      .from('branches')
      .select('id,name,restaurant_id,is_active')
      .eq('id', branchId)
      .maybeSingle();

    if (branchError) {
      throw new Error(branchError.message || 'Could not load branch');
    }

    if (!currentBranch?.restaurant_id) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    const [{ data: restaurant }, { data: branches }] = await Promise.all([
      (supabaseServer as any)
        .from('restaurants')
        .select('id,name')
        .eq('id', currentBranch.restaurant_id)
        .maybeSingle(),
      (supabaseServer as any)
        .from('branches')
        .select('id,name,is_active')
        .eq('restaurant_id', currentBranch.restaurant_id)
        .eq('is_active', true)
    ]);

    const activeBranches = Array.isArray(branches) ? branches : [];
    const branchIds = activeBranches.map((branch) => String(branch.id));

    if (branchIds.length === 0) {
      return NextResponse.json({
        summary: {
          restaurantId: String(currentBranch.restaurant_id),
          restaurantName: typeof restaurant?.name === 'string' ? restaurant.name : '',
          avgRating: null,
          reviewCount: 0
        },
        reviews: []
      });
    }

    const { data: allReviews, error: allReviewsError } = await (supabaseServer as any)
      .from('branch_reviews')
      .select('id,branch_id,rating,comment,created_at')
      .in('branch_id', branchIds)
      .order('created_at', { ascending: false });

    if (allReviewsError) {
      throw new Error(allReviewsError.message || 'Could not load branch reviews');
    }

    const branchNameById = new Map<string, string>(
      activeBranches.map((branch) => [String(branch.id), typeof branch.name === 'string' ? branch.name : 'Branch'])
    );

    const reviewsArray = Array.isArray(allReviews) ? allReviews : [];

    // ⚡ Bolt: Single-pass optimization. Combines multiple array operations (map/filter/reduce)
    // to prevent redundant allocations and compute metrics directly inline.
    let ratingSum = 0;
    let ratedCount = 0;
    const reviews = [];

    for (const review of reviewsArray) {
      const rating = toNumber(review.rating);
      const comment = typeof review.comment === 'string' ? review.comment.trim() : '';

      if (typeof rating === 'number') {
        ratingSum += rating;
        ratedCount++;
      }

      if (comment.length > 0 && reviews.length < limit) {
        const branchIdStr = String(review.branch_id);
        reviews.push({
          id: String(review.id),
          branchId: branchIdStr,
          branchName: branchNameById.get(branchIdStr) || 'Branch',
          rating,
          comment,
          createdAt: review.created_at ? String(review.created_at) : null
        });
      }
    }

    const avgRating = ratedCount > 0 ? Number((ratingSum / ratedCount).toFixed(2)) : null;

    return NextResponse.json({
      summary: {
        restaurantId: String(currentBranch.restaurant_id),
        restaurantName: typeof restaurant?.name === 'string' ? restaurant.name : '',
        avgRating,
        reviewCount: reviewsArray.length
      },
      reviews
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not fetch branch reviews' },
      { status: 500 }
    );
  }
}
