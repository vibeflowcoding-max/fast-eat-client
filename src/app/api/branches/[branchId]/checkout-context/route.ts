import { NextRequest, NextResponse } from 'next/server';
import { getBranchCheckoutContextPayload } from '@/server/consumer/branches';

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

    const payload = await getBranchCheckoutContextPayload(normalizedBranchId);
    if (!payload) {
      return NextResponse.json({ error: 'Branch not found' }, { status: 404 });
    }

    return NextResponse.json(payload, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load checkout context' },
      { status: 500 },
    );
  }
}