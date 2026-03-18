import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { validateDealForCart } from '@/server/offers/order-offers';

const previewSchema = z.object({
  branchId: z.string().trim().min(1),
  promoCode: z.string().trim().optional(),
  subtotal: z.number().nonnegative().optional(),
  items: z.array(z.object({
    item_id: z.string().trim().optional(),
    combo_id: z.string().trim().optional(),
    quantity: z.number().min(1),
    combo_items: z.array(z.object({
      item_id: z.string().trim().min(1),
      quantity: z.number().min(1).optional(),
    })).optional(),
  })).min(1),
});

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json().catch(() => null);
    const parsed = previewSchema.safeParse(payload);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid offer preview payload' }, { status: 400 });
    }

    const subtotal = Number(parsed.data.subtotal || 0);
    const validation = await validateDealForCart({
      branchId: parsed.data.branchId,
      promoCode: parsed.data.promoCode,
      subtotal,
      cartItems: parsed.data.items,
    });

    return NextResponse.json({
      data: {
        appliedDiscount: validation.applied && validation.deal && typeof validation.discountAmount === 'number'
          ? {
              sourceType: 'deal',
              dealId: validation.deal.id,
              comboId: null,
              title: validation.deal.title,
              discountType: validation.deal.discount_type,
              discountValue: validation.deal.discount_value,
              discountAmount: validation.discountAmount,
              subtotal,
              promoCode: validation.deal.promo_code || null,
              applicationMode: validation.deal.application_mode,
            }
          : null,
        reason: validation.reason || null,
      },
    }, {
      headers: {
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not preview offers' },
      { status: 500 },
    );
  }
}