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

export async function GET(request: NextRequest, context: { params: Promise<{ orderId: string }> }) {
  try {
    const { orderId } = await context.params;
    const normalizedOrderId = decodeURIComponent(orderId || '').trim();
    const customerId = request.nextUrl.searchParams.get('customerId')?.trim() ?? '';

    if (!normalizedOrderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const selectOrderFields = 'id,order_number,branch_id,restaurant_id,status_id,delivery_address,notes,estimated_time,payment_method,total,created_at';

    let { data: orderRaw, error: orderByIdError } = await (supabaseServer as any)
      .from('orders')
      .select(selectOrderFields)
      .eq('id', normalizedOrderId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (orderByIdError) {
      throw new Error(orderByIdError.message);
    }

    if (!orderRaw) {
      const { data: orderByNumber, error: orderByNumberError } = await (supabaseServer as any)
        .from('orders')
        .select(selectOrderFields)
        .eq('order_number', normalizedOrderId)
        .eq('customer_id', customerId)
        .maybeSingle();

      if (orderByNumberError) {
        throw new Error(orderByNumberError.message);
      }

      orderRaw = orderByNumber;
    }

    if (!orderRaw) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [{ data: orderStatus }, { data: orderItems }, { data: bids }, { data: restaurant }] = await Promise.all([
      orderRaw?.status_id
        ? (supabaseServer as any)
            .from('order_statuses')
            .select('code,label')
            .eq('id', orderRaw.status_id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      (supabaseServer as any)
        .from('order_items')
        .select('name,quantity,price,special_instructions,subtotal')
        .eq('order_id', orderRaw.id),
      (supabaseServer as any)
        .from('delivery_bids')
        .select('id,order_id,driver_id,status,driver_offer,base_price,final_price,estimated_time_minutes,driver_notes,driver_rating_snapshot,created_at,expires_at,accepted_at,rejected_at')
        .eq('order_id', orderRaw.id)
        .order('created_at', { ascending: false }),
      orderRaw?.restaurant_id
        ? (supabaseServer as any)
            .from('restaurants')
            .select('id,name,logo_url')
            .eq('id', orderRaw.restaurant_id)
            .maybeSingle()
        : Promise.resolve({ data: null })
    ]);

    const normalizedBids = Array.isArray(bids)
      ? bids.map((bid) => ({
          id: String(bid.id),
          driverId: bid.driver_id ? String(bid.driver_id) : null,
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

    const acceptedDeliveryBid = normalizedBids.find(
      (bid) => Boolean(bid.acceptedAt) || bid.status === 'accepted' || bid.status === 'delivering'
    );

    return NextResponse.json({
      order: {
        id: String(orderRaw.id),
        orderNumber: typeof orderRaw?.order_number === 'string' ? orderRaw.order_number : null,
        statusCode: typeof orderStatus?.code === 'string' ? String(orderStatus.code) : null,
        statusLabel: typeof orderStatus?.label === 'string' ? String(orderStatus.label) : null,
        total: toNumber(orderRaw?.total),
        createdAt: String(orderRaw?.created_at ?? ''),
        items: Array.isArray(orderItems)
          ? orderItems.map((item: any) => ({
              name: item?.name,
              quantity: item?.quantity,
              price: toNumber(item?.price),
              notes: item?.special_instructions ?? null,
              subtotal: toNumber(item?.subtotal),
            }))
          : [],
        branchId: orderRaw?.branch_id ? String(orderRaw.branch_id) : null,
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
        acceptedDeliveryBid: acceptedDeliveryBid
          ? {
              id: acceptedDeliveryBid.id,
              driverId: acceptedDeliveryBid.driverId
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
