import { NextRequest, NextResponse } from 'next/server';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ branchId: string }> },
) {
  try {
    const { branchId } = await context.params;
    const normalizedBranchId = String(branchId || '').trim();

    if (!normalizedBranchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const { response, payload } = await fetchFastEat(
      `/mcp/public/branches/${encodeURIComponent(normalizedBranchId)}/menu`,
      { method: 'GET' },
    );

    if (!response.ok) {
      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Could not load branch menu') },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load branch menu' },
      { status: 500 },
    );
  }
}