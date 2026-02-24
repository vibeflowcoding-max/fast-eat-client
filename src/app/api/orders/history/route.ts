import { NextRequest, NextResponse } from 'next/server';
import { findCustomerIdByPhone } from '@/app/api/customer/_lib';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type OrderRow = {
  id: string;
  restaurant_id: string | null;
  status_code: string | null;
  status_label: string | null;
  total: number | string | null;
  created_at: string;
  items: unknown;
};

type OrderNumberRow = {
  id: string;
  order_number: string | null;
};

const INACTIVE_STATUS = new Set(['delivered', 'completed', 'cancelled', 'refunded']);

function isActiveStatus(status: string | null | undefined) {
  if (!status) {
    return true;
  }

  return !INACTIVE_STATUS.has(status.toLowerCase());
}

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
    const phone = request.nextUrl.searchParams.get('phone')?.trim() ?? '';

    if (!phone) {
      return NextResponse.json({ activeOrders: [], pastOrders: [] });
    }

    const customerId = await findCustomerIdByPhone(phone);
    if (!customerId) {
      return NextResponse.json({ activeOrders: [], pastOrders: [] });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await (supabaseServer as any)
      .from('orders_with_details')
      .select('id,restaurant_id,status_code,status_label,total,created_at,items')
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })
      .limit(40);

    if (error) {
      throw new Error(error.message);
    }

    const orders = (data ?? []) as OrderRow[];
    const restaurantIds = [...new Set(orders.map((order) => order.restaurant_id).filter(Boolean))] as string[];

    const [{ data: bidsData }, { data: restaurantsData }, { data: orderNumbersData }] = await Promise.all([
      (supabaseServer as any)
        .from('delivery_bids')
        .select('order_id,id,status,driver_offer,base_price,final_price,estimated_time_minutes,driver_notes,driver_rating_snapshot,created_at,expires_at')
        .in('order_id', orders.map((order) => order.id)),
      restaurantIds.length
        ? (supabaseServer as any)
            .from('restaurants')
            .select('id,name,logo_url')
            .in('id', restaurantIds)
        : Promise.resolve({ data: [] }),
      orders.length
        ? (supabaseServer as any)
            .from('orders')
            .select('id,order_number')
            .in('id', orders.map((order) => order.id))
        : Promise.resolve({ data: [] })
    ]);

    const restaurantById = new Map<string, { id: string; name: string; logo_url: string | null }>();
    for (const restaurant of (restaurantsData ?? []) as Array<{ id: string; name: string; logo_url: string | null }>) {
      restaurantById.set(restaurant.id, restaurant);
    }

    const bidsByOrder = new Map<string, Array<Record<string, unknown>>>();
    for (const bid of (bidsData ?? []) as Array<Record<string, unknown>>) {
      const orderId = String(bid.order_id ?? '');
      if (!orderId) {
        continue;
      }

      const current = bidsByOrder.get(orderId) ?? [];
      current.push(bid);
      bidsByOrder.set(orderId, current);
    }

    const orderNumberById = new Map<string, string | null>();
    for (const order of (orderNumbersData ?? []) as OrderNumberRow[]) {
      orderNumberById.set(order.id, order.order_number ?? null);
    }

    const normalizedOrders = orders.map((order) => {
      const bids = bidsByOrder.get(order.id) ?? [];
      const activeBids = bids.filter((bid) => String(bid.status ?? '').toLowerCase() === 'active');
      const bestBid = activeBids
        .map((bid) => toNumber(bid.driver_offer ?? bid.final_price ?? bid.base_price))
        .filter((value) => value > 0)
        .sort((a, b) => a - b)[0] ?? null;

      return {
        id: order.id,
        orderNumber: orderNumberById.get(order.id) ?? null,
        statusCode: order.status_code,
        statusLabel: order.status_label,
        total: toNumber(order.total),
        createdAt: order.created_at,
        items: Array.isArray(order.items) ? order.items : [],
        restaurant: order.restaurant_id ? restaurantById.get(order.restaurant_id) ?? null : null,
        bids: activeBids,
        bidCount: activeBids.length,
        bestBid
      };
    });

    const activeOrders = normalizedOrders.filter((order) => isActiveStatus(order.statusCode));
    const pastOrders = normalizedOrders.filter((order) => !isActiveStatus(order.statusCode));

    return NextResponse.json({
      activeOrders,
      pastOrders
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not fetch order history'
      },
      { status: 500 }
    );
  }
}
