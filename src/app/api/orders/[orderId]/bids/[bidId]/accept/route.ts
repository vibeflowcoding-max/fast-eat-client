import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ orderId: string; bidId: string }> }
) {
  try {
    const { orderId, bidId } = await params;
    const supabase = getSupabaseServer();
    const deliveryBidsTable = supabase.from('delivery_bids') as any;
    const ordersTable = supabase.from('orders') as any;

    // 1. Get the bid to be accepted
    const { data: bid, error: bidError } = await deliveryBidsTable
      .select('*')
      .eq('id', bidId)
      .single();

    if (bidError || !bid) {
      return NextResponse.json({ success: false, message: 'Bid not found' }, { status: 404 });
    }

    // 2. Accept the bid (final_price should be driver_offer or customer_counter_offer or base_price)
    const bidRow = bid as {
      customer_counter_offer?: number | null;
      driver_offer?: number | null;
      base_price?: number | null;
    };
    const finalPrice = bidRow.customer_counter_offer ?? bidRow.driver_offer ?? bidRow.base_price ?? 0;

    const { error: updateBidError } = await deliveryBidsTable
      .update({
        status: 'accepted',
        final_price: finalPrice,
        accepted_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', bidId);

    if (updateBidError) {
      return NextResponse.json({ success: false, message: updateBidError.message }, { status: 400 });
    }

    // 3. Update the order status to DRIVER_ASSIGNED (8)
    const { error: updateOrderError } = await ordersTable
      .update({
        status_id: 8,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateOrderError) {
      return NextResponse.json({ success: false, message: updateOrderError.message }, { status: 400 });
    }

    // 4. Reject all other bids for this order
    await deliveryBidsTable
      .update({ status: 'rejected', updated_at: new Date().toISOString() })
      .eq('order_id', orderId)
      .neq('id', bidId)
      .in('status', ['pending', 'countered']);

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        status: 'accepted',
        label: 'Repartidor asignado',
        deliveryFinalPrice: finalPrice
      }
    });

  } catch (error: any) {
    console.error('[API/Bids/Accept] Fatal Error:', error);
    return NextResponse.json({ success: false, message: error?.message || 'Internal server error' }, { status: 500 });
  }
}
