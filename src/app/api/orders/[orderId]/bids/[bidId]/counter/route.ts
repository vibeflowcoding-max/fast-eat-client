import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ orderId: string; bidId: string }> }
) {
    try {
        const { orderId, bidId } = await params;
        const { customerCounterOffer } = await req.json();

        const supabase = getSupabaseServer();

        // Directly update the delivery bid in Supabase
        // This matches the logic in fast-eat-delivery/src/services/auction.service.ts
        const { data, error } = await supabase
            .from('delivery_bids')
            .update({
                customer_counter_offer: customerCounterOffer,
                status: 'countered',
                updated_at: new Date().toISOString(),
            })
            .eq('id', bidId)
            .eq('order_id', orderId)
            .select()
            .single();

        if (error) {
            console.error('[API/Bids/Counter] Supabase Error:', error);
            return NextResponse.json(
                { success: false, message: error.message },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            data: {
                orderId: data.order_id,
                status: data.status,
                label: 'Contraoferta enviada'
            }
        });

    } catch (error: any) {
        console.error('[API/Bids/Counter] Fatal Error:', error);
        return NextResponse.json({ success: false, message: error?.message || 'Internal server error' }, { status: 500 });
    }
}
