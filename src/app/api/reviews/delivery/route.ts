import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { findCustomerIdByPhone } from '@/app/api/customer/_lib';

export const dynamic = 'force-dynamic';

interface DeliveryReviewBody {
  orderId?: string;
  phone?: string;
  rating?: number;
  comment?: string;
  driverId?: string;
  deliveryBidId?: string;
}

function normalizeStatus(code: unknown): string {
  return typeof code === 'string' ? code.toUpperCase() : '';
}

function isReviewableOrderStatus(code: string): boolean {
  return code === 'COMPLETED' || code === 'DELIVERED';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as DeliveryReviewBody;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (!orderId || !phone) {
      return NextResponse.json({ error: 'orderId and phone are required' }, { status: 400 });
    }

    if (!Number.isInteger(body.rating) || (body.rating ?? 0) < 1 || (body.rating ?? 0) > 5) {
      return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 });
    }

    if (comment.length > 500) {
      return NextResponse.json({ error: 'comment must be at most 500 characters' }, { status: 400 });
    }

    const customerId = await findCustomerIdByPhone(phone);
    if (!customerId) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const supabaseServer = getSupabaseServer();

    const { data: order, error: orderError } = await (supabaseServer as any)
      .from('orders')
      .select('id,customer_id,status_id,completed_at')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message || 'Could not load order');
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: statusRecord } = await (supabaseServer as any)
      .from('order_statuses')
      .select('code')
      .eq('id', order.status_id)
      .maybeSingle();

    const statusCode = normalizeStatus(statusRecord?.code);
    const completed = Boolean(order.completed_at) || isReviewableOrderStatus(statusCode);

    if (!completed) {
      return NextResponse.json({ error: 'Order must be completed before leaving a review' }, { status: 400 });
    }

    const { data: bids, error: bidsError } = await (supabaseServer as any)
      .from('delivery_bids')
      .select('id,driver_id,status,accepted_at,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false });

    if (bidsError) {
      throw new Error(bidsError.message || 'Could not load delivery bids');
    }

    const acceptedBid = Array.isArray(bids)
      ? bids.find(
          (bid) =>
            Boolean(bid.accepted_at) ||
            normalizeStatus(bid.status) === 'ACCEPTED' ||
            normalizeStatus(bid.status) === 'DELIVERING'
        )
      : null;

    const derivedDriverId =
      (typeof body.driverId === 'string' && body.driverId.trim()) ||
      (acceptedBid?.driver_id ? String(acceptedBid.driver_id) : '');

    const derivedDeliveryBidId =
      (typeof body.deliveryBidId === 'string' && body.deliveryBidId.trim()) ||
      (acceptedBid?.id ? String(acceptedBid.id) : '');

    if (!derivedDriverId || !derivedDeliveryBidId) {
      return NextResponse.json({ error: 'delivery_assignment_not_found' }, { status: 400 });
    }

    const payload = {
      order_id: orderId,
      customer_id: customerId,
      driver_id: derivedDriverId,
      delivery_bid_id: derivedDeliveryBidId,
      rating: body.rating,
      comment: comment || null,
      updated_at: new Date().toISOString()
    };

    const { data: review, error: upsertError } = await (supabaseServer as any)
      .from('delivery_reviews')
      .upsert(payload, { onConflict: 'order_id,customer_id' })
      .select('id,order_id,customer_id,driver_id,delivery_bid_id,rating,comment,created_at,updated_at')
      .single();

    if (upsertError) {
      throw new Error(upsertError.message || 'Could not submit delivery review');
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not submit delivery review' },
      { status: 500 }
    );
  }
}
