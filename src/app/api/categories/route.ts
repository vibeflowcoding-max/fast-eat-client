import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// Force dynamic to avoid build-time Supabase calls
export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const { data, error } = await supabase
            .from('restaurant_categories')
            .select('*')
            .order('name');

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data);
    } catch (err) {
        console.error('Error fetching categories:', err);
        return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }
}
