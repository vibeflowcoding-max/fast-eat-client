import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { findCustomerIdByPhone } from '@/app/api/customer/_lib';

export const dynamic = 'force-dynamic';

interface RestaurantReviewBody {
  orderId?: string;
  phone?: string;
  branchId?: string;
  rating?: number;
  comment?: string;
}

function normalizeStatus(code: unknown): string {
  return typeof code === 'string' ? code.toUpperCase() : '';
}

function isReviewableOrderStatus(code: string): boolean {
  return code === 'COMPLETED' || code === 'DELIVERED';
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as RestaurantReviewBody;
    const orderId = typeof body.orderId === 'string' ? body.orderId.trim() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const branchId = typeof body.branchId === 'string' ? body.branchId.trim() : '';
    const comment = typeof body.comment === 'string' ? body.comment.trim() : '';

    if (!orderId || !phone || !branchId) {
      return NextResponse.json({ error: 'orderId, phone and branchId are required' }, { status: 400 });
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

    if (!order.branch_id || String(order.branch_id) !== branchId) {
      return NextResponse.json({ error: 'branchId does not match order branch' }, { status: 400 });
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

    const payload = {
      order_id: orderId,
      branch_id: branchId,
      customer_id: customerId,
      rating: body.rating,
      comment: comment || null,
      updated_at: new Date().toISOString()
    };

    const { data: review, error: upsertError } = await (supabaseServer as any)
      .from('branch_reviews')
      .upsert(payload, { onConflict: 'order_id' })
      .select('id,order_id,branch_id,customer_id,rating,comment,created_at,updated_at')
      .single();

    if (upsertError) {
      throw new Error(upsertError.message || 'Could not submit restaurant review');
    }

    return NextResponse.json({ success: true, review });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not submit restaurant review' },
      { status: 500 }
    );
  }
}
