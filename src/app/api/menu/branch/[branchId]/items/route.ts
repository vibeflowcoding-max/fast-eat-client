import { NextRequest, NextResponse } from 'next/server';
import { getBranchMenuItemsPayload } from '@/server/consumer/menu';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ branchId: string }> },
) {
  try {
    const { branchId } = await context.params;
    const normalizedBranchId = String(branchId || '').trim();
    const categoryId = request.nextUrl.searchParams.get('categoryId')?.trim() ?? '';
    const cursor = request.nextUrl.searchParams.get('cursor')?.trim() ?? '0';
    const limit = request.nextUrl.searchParams.get('limit')?.trim() ?? '12';
    const channel = request.nextUrl.searchParams.get('channel')?.trim() ?? 'delivery';

    if (!normalizedBranchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    if (!categoryId) {
      return NextResponse.json({ error: 'categoryId is required' }, { status: 400 });
    }

    return NextResponse.json(
      await getBranchMenuItemsPayload(normalizedBranchId, { categoryId, cursor, limit }),
      {
        headers: {
          'Cache-Control': 'no-store',
        },
      },
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load menu items' },
      { status: 500 },
    );
  }
}