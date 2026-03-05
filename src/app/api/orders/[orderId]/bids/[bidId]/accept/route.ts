import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string; bidId: string }> }
) {
  try {
    const { orderId, bidId } = await params;
    const supabase = getSupabaseServer();
    const { data: acceptResult, error: acceptError } = await (supabase as any).rpc('accept_delivery_bid', {
      p_order_id: orderId,
      p_bid_id: bidId,
    });

    if (acceptError) {
      return NextResponse.json({ success: false, message: acceptError.message || 'Unable to accept bid' }, { status: 400 });
    }

    const { data: orderRow, error: orderError } = await (supabase as any)
      .from('orders')
      .select('id,total,customer_total,delivery_fee,delivery_final_price')
      .eq('id', orderId)
      .maybeSingle();

    if (orderError || !orderRow) {
      return NextResponse.json({ success: false, message: orderError?.message || 'Order not found after accepting bid' }, { status: 400 });
    }

    const subtotal = Number(orderRow.total ?? 0);
    const customerTotal = Number(orderRow.customer_total ?? subtotal);
    const deliveryPrice = Number(orderRow.delivery_final_price ?? orderRow.delivery_fee ?? 0);
    const feesTotal = Math.max(0, customerTotal - subtotal - deliveryPrice);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        status: String(acceptResult?.status || 'DRIVER_ASSIGNED'),
        label: 'Repartidor asignado',
        deliveryFinalPrice: deliveryPrice,
        subtotal,
        feesTotal,
        customerTotal,
      }
    });

  } catch (error: any) {
    console.error('[API/Bids/Accept] Fatal Error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Internal server error' }, { status: 500 });
  }
}
