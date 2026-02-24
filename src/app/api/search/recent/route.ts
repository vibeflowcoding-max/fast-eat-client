import { NextRequest, NextResponse } from 'next/server';
import { ensureCustomerByPhone, findCustomerIdByPhone } from '@/app/api/customer/_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function normalizeQuery(value: string) {
  return value.trim().toLowerCase();
}

export async function GET(request: NextRequest) {
  try {
    const phone = request.nextUrl.searchParams.get('phone')?.trim() ?? '';

    if (!phone) {
      return NextResponse.json({ recentSearches: [] });
    }

    const customerId = await findCustomerIdByPhone(phone);
    if (!customerId) {
      return NextResponse.json({ recentSearches: [] });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await (supabaseServer as any)
      .from('customer_searches')
      .select('query, normalized_query, created_at')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(25);

    if (error) {
      throw new Error(error.message);
    }

    const unique = new Set<string>();
    const recentSearches: Array<{ query: string; createdAt: string }> = [];

    for (const row of (data ?? []) as Array<{ query: string; normalized_query: string; created_at: string }>) {
      if (unique.has(row.normalized_query)) {
        continue;
      }

      unique.add(row.normalized_query);
      recentSearches.push({ query: row.query, createdAt: row.created_at });

      if (recentSearches.length >= 5) {
        break;
      }
    }

    return NextResponse.json({ recentSearches });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not fetch recent searches' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const fullName = typeof body?.name === 'string' ? body.name.trim() : undefined;
    const rawQuery = typeof body?.query === 'string' ? body.query.trim() : '';

    if (!phone || !rawQuery) {
      return NextResponse.json({ error: 'phone and query are required' }, { status: 400 });
    }

    const normalizedQuery = normalizeQuery(rawQuery);
    if (!normalizedQuery) {
      return NextResponse.json({ error: 'query cannot be empty' }, { status: 400 });
    }

    const { customerId } = await ensureCustomerByPhone({ phone, fullName });
    const supabaseServer = getSupabaseServer();

    const { error } = await (supabaseServer as any)
      .from('customer_searches')
      .insert({
        customer_id: customerId,
        query: rawQuery,
        normalized_query: normalizedQuery
      });

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not save search' },
      { status: 500 }
    );
  }
}
