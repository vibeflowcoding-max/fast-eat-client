import { NextRequest, NextResponse } from 'next/server';
import { getBranchMenuCategoriesPayload } from '@/server/consumer/menu';

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

    return NextResponse.json(await getBranchMenuCategoriesPayload(normalizedBranchId), {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load menu categories' },
      { status: 500 },
    );
  }
}