import { NextRequest, NextResponse } from 'next/server';
import { findCustomerIdByPhone } from '@/app/api/customer/_lib';
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

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const phone = request.nextUrl.searchParams.get('phone')?.trim() ?? '';

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    const customerId = await findCustomerIdByPhone(phone);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const supabaseServer = getSupabaseServer();

    const { data: orderView, error: orderViewError } = await (supabaseServer as any)
      .from('orders_with_details')
      .select('id,restaurant_id,status_code,status_label,total,created_at,items')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (orderViewError) {
      throw new Error(orderViewError.message);
    }

    if (!orderView) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [{ data: orderRaw }, { data: bids }, { data: restaurant }] = await Promise.all([
      (supabaseServer as any)
        .from('orders')
        .select('id,order_number,delivery_address,notes,estimated_time,payment_method,total,created_at')
        .eq('id', orderId)
        .maybeSingle(),
      (supabaseServer as any)
        .from('delivery_bids')
        .select('id,order_id,status,driver_offer,base_price,final_price,estimated_time_minutes,driver_notes,driver_rating_snapshot,created_at,expires_at,accepted_at,rejected_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false }),
      orderView.restaurant_id
        ? (supabaseServer as any)
            .from('restaurants')
            .select('id,name,logo_url')
            .eq('id', orderView.restaurant_id)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const normalizedBids = Array.isArray(bids)
      ? bids.map((bid) => ({
          id: String(bid.id),
          status: String(bid.status ?? '').toLowerCase(),
          driverOffer: toNumber(bid.driver_offer),
          basePrice: toNumber(bid.base_price),
          finalPrice: toNumber(bid.final_price),
          estimatedTimeMinutes: typeof bid.estimated_time_minutes === 'number' ? bid.estimated_time_minutes : null,
          driverNotes: typeof bid.driver_notes === 'string' ? bid.driver_notes : null,
          driverRatingSnapshot: bid.driver_rating_snapshot != null ? toNumber(bid.driver_rating_snapshot) : null,
          createdAt: String(bid.created_at ?? ''),
          expiresAt: bid.expires_at ? String(bid.expires_at) : null,
          acceptedAt: bid.accepted_at ? String(bid.accepted_at) : null,
          rejectedAt: bid.rejected_at ? String(bid.rejected_at) : null
        }))
      : [];

    return NextResponse.json({
      order: {
        id: String(orderView.id),
        orderNumber: typeof orderRaw?.order_number === 'string' ? orderRaw.order_number : null,
        statusCode: orderView.status_code ? String(orderView.status_code) : null,
        statusLabel: orderView.status_label ? String(orderView.status_label) : null,
        total: toNumber(orderView.total ?? orderRaw?.total),
        createdAt: String(orderView.created_at ?? orderRaw?.created_at ?? ''),
        items: Array.isArray(orderView.items) ? orderView.items : [],
        deliveryAddress: typeof orderRaw?.delivery_address === 'string' ? orderRaw.delivery_address : null,
        notes: typeof orderRaw?.notes === 'string' ? orderRaw.notes : null,
        estimatedTime: typeof orderRaw?.estimated_time === 'number' ? orderRaw.estimated_time : null,
        paymentMethod: orderRaw?.payment_method ? String(orderRaw.payment_method) : null,
        restaurant: restaurant
          ? {
              id: String(restaurant.id),
              name: String(restaurant.name),
              logo_url: restaurant.logo_url ? String(restaurant.logo_url) : null
            }
          : null,
        bids: normalizedBids
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not fetch order details' },
      { status: 500 }
    );
  }
}
