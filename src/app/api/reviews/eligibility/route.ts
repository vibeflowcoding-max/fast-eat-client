import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

function normalizeStatus(code: unknown): string {
  return typeof code === 'string' ? code.toUpperCase() : '';
}

function isReviewableOrderStatus(code: string): boolean {
  return code === 'COMPLETED' || code === 'DELIVERED';
}

export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get('orderId')?.trim() ?? '';
    const customerId = request.nextUrl.searchParams.get('customerId')?.trim() ?? '';

    if (!orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (!customerId) {
      return NextResponse.json({ error: 'customerId is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const { data: order, error: orderError } = await (supabaseServer as any)
      .from('orders')
      .select('id,customer_id,branch_id,status_id,completed_at')
      .eq('id', orderId)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (orderError) {
      throw new Error(orderError.message || 'Could not load order');
    }

    if (!order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const [{ data: statusRecord }, { data: restaurantReview }, { data: deliveryReview }, { data: bids }] = await Promise.all([
      (supabaseServer as any)
        .from('order_statuses')
        .select('code')
        .eq('id', order.status_id)
        .maybeSingle(),
      (supabaseServer as any)
        .from('branch_reviews')
        .select('id,rating,comment,created_at,updated_at')
        .eq('order_id', orderId)
        .maybeSingle(),
      (supabaseServer as any)
        .from('delivery_reviews')
        .select('id,rating,comment,driver_id,delivery_bid_id,created_at,updated_at')
        .eq('order_id', orderId)
        .eq('customer_id', customerId)
        .maybeSingle(),
      (supabaseServer as any)
        .from('delivery_bids')
        .select('id,driver_id,status,accepted_at,created_at')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false })
    ]);

    const statusCode = normalizeStatus(statusRecord?.code);
    const orderCompleted = Boolean(order.completed_at) || isReviewableOrderStatus(statusCode);

    const acceptedBid = Array.isArray(bids)
      ? bids.find(
          (bid) =>
            Boolean(bid.accepted_at) ||
            normalizeStatus(bid.status) === 'ACCEPTED' ||
            normalizeStatus(bid.status) === 'DELIVERING'
        )
      : null;

    const restaurantReasons: string[] = [];
    const deliveryReasons: string[] = [];

    if (!orderCompleted) {
      restaurantReasons.push('order_not_completed');
      deliveryReasons.push('order_not_completed');
    }

    if (!acceptedBid || !acceptedBid.driver_id) {
      deliveryReasons.push('delivery_assignment_not_found');
    }

    return NextResponse.json({
      canReviewRestaurant: orderCompleted,
      canReviewDelivery: orderCompleted && Boolean(acceptedBid?.driver_id),
      reasons: {
        restaurant: restaurantReasons,
        delivery: deliveryReasons
      },
      existing: {
        restaurant: restaurantReview
          ? {
              id: String(restaurantReview.id),
              rating: Number(restaurantReview.rating),
              comment: typeof restaurantReview.comment === 'string' ? restaurantReview.comment : '',
              createdAt: restaurantReview.created_at ? String(restaurantReview.created_at) : null,
              updatedAt: restaurantReview.updated_at ? String(restaurantReview.updated_at) : null
            }
          : null,
        delivery: deliveryReview
          ? {
              id: String(deliveryReview.id),
              rating: Number(deliveryReview.rating),
              comment: typeof deliveryReview.comment === 'string' ? deliveryReview.comment : '',
              driverId: deliveryReview.driver_id ? String(deliveryReview.driver_id) : null,
              deliveryBidId: deliveryReview.delivery_bid_id ? String(deliveryReview.delivery_bid_id) : null,
              createdAt: deliveryReview.created_at ? String(deliveryReview.created_at) : null,
              updatedAt: deliveryReview.updated_at ? String(deliveryReview.updated_at) : null
            }
          : null
      },
      targets: {
        branchId: order.branch_id ? String(order.branch_id) : null,
        driverId: acceptedBid?.driver_id ? String(acceptedBid.driver_id) : null,
        acceptedBidId: acceptedBid?.id ? String(acceptedBid.id) : null
      }
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load review eligibility' },
      { status: 500 }
    );
  }
}
