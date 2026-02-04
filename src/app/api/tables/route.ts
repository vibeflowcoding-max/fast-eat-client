import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const branchId = searchParams.get('branchId');

  if (!branchId || branchId === 'undefined' || branchId === ':branchId') {
    return NextResponse.json({ quantity: 0, is_available: false, note: 'ID_NOT_PROVIDED' });
  }

  try {

    // Note: The user provided 'branch_quantity_tables' (missing 'n' in branch)
    const { data, error } = await supabase
      .from('branch_quantity_tables')
      .select('quantity, is_available')
      .eq('branch_id', branchId)
      .maybeSingle(); // Changed single() to maybeSingle() to avoid error code P3001 if missing

    if (error) {
      console.error(`[API/Tables] Error fetching for branch ${branchId}:`, error);
      return NextResponse.json({ quantity: 0, is_available: false, error: 'DB_ERROR' });
    }

    if (!data) {
      console.log(`[API/Tables] No config found for branch ${branchId}. Using defaults.`);
      return NextResponse.json({ quantity: 0, is_available: false });
    }

    return NextResponse.json({
      quantity: Number(data.quantity) || 0,
      is_available: data.is_available ?? false
    });
  } catch (err: any) {
    console.error('[API/Tables] Fatal error:', err);
    return NextResponse.json({ quantity: 0, is_available: false, fatal: true }, { status: 500 });
  }
}

