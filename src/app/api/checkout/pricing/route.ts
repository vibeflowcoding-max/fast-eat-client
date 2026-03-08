import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function toNumber(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return 0;
}

export async function GET(request: NextRequest) {
  try {
    const branchId = request.nextUrl.searchParams.get('branchId')?.trim() ?? '';

    if (!branchId) {
      return NextResponse.json({ error: 'branchId is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await (supabaseServer as any)
      .from('fee_rules')
      .select('branch_id,service_fee,platform_fee,active,created_at')
      .or(`branch_id.eq.${branchId},branch_id.is.null`)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = Array.isArray(data) ? data : [];
    const matchedRule = rows.find((row) => row.branch_id === branchId) ?? rows.find((row) => !row.branch_id) ?? null;

    const serviceFeeRate = toNumber(matchedRule?.service_fee);
    const platformFeeRate = toNumber(matchedRule?.platform_fee);

    return NextResponse.json({
      branchId,
      serviceFeeRate,
      platformFeeRate,
      source: matchedRule?.branch_id ? 'branch' : matchedRule ? 'global' : 'default',
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not resolve checkout pricing' },
      { status: 500 },
    );
  }
}
