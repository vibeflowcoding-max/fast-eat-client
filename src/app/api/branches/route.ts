import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabaseServer = getSupabaseServer();
    const { data: branches, error } = await supabaseServer
      .from('branches')
      .select('id, name, image_url, city, address')
      .eq('is_active', true)
      .order('name');

    if (error) {
      throw error;
    }

    return NextResponse.json(branches);
  } catch (error: any) {
    console.error('Error fetching branches:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
