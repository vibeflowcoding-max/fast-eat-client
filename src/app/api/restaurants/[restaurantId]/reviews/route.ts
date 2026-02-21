import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

interface ReviewRequestBody {
  orderId: string;
  rating: number;
  comment?: string;
  customerId?: string;
}

function isCompletedOrderStatus(code: string | null | undefined) {
  return (code || '').toUpperCase() === 'COMPLETED';
}

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ restaurantId: string }> }
) {
  try {
    const supabaseServer = getSupabaseServer();
    const { restaurantId } = await context.params;
    const body = (await request.json()) as ReviewRequestBody;

    if (!restaurantId) {
      return NextResponse.json({ error: 'restaurantId is required' }, { status: 400 });
    }

    if (!body?.orderId) {
      return NextResponse.json({ error: 'orderId is required' }, { status: 400 });
    }

    if (!Number.isInteger(body?.rating) || body.rating < 1 || body.rating > 5) {
      return NextResponse.json({ error: 'rating must be an integer between 1 and 5' }, { status: 400 });
    }

    const { data: order, error: orderError } = await (supabaseServer as any)
      .from('orders')
      .select('id, restaurant_id, customer_id, completed_at, status_id')
      .eq('id', body.orderId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found for this restaurant' }, { status: 404 });
    }

    const { data: statusRecord } = await (supabaseServer as any)
      .from('order_statuses')
      .select('code')
      .eq('id', order.status_id)
      .maybeSingle();

    const isCompleted = Boolean(order.completed_at) || isCompletedOrderStatus(statusRecord?.code);
    if (!isCompleted) {
      return NextResponse.json({ error: 'Order must be completed before leaving a review' }, { status: 400 });
    }

    if (body.customerId && order.customer_id && body.customerId !== order.customer_id) {
      return NextResponse.json({ error: 'customerId does not match order owner' }, { status: 403 });
    }

    const payload = {
      restaurant_id: restaurantId,
      order_id: body.orderId,
      customer_id: body.customerId || order.customer_id || null,
      rating: body.rating,
      comment: body.comment?.trim() || null
    };

    const { data: review, error: reviewError } = await (supabaseServer as any)
      .from('restaurant_reviews')
      .upsert(payload, { onConflict: 'order_id' })
      .select('id, restaurant_id, order_id, customer_id, rating, comment, created_at, updated_at')
      .single();

    if (reviewError) {
      return NextResponse.json({ error: reviewError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, review });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unexpected error creating review';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
