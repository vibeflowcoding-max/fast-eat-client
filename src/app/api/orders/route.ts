import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { postN8nWebhook } from '@/app/api/_server/upstreams/n8n';
import { getSupabaseServer } from '@/lib/supabase-server';
import { createBranchOrderRpcLocal, createConsumerOrderLocal } from '@/server/orders/create';

const n8nOrderSchema = z.object({
  message: z.string().trim().min(1),
  fromNumber: z.string().trim().optional().default(''),
  branch_id: z.string().trim().min(1),
  intencion: z.string().trim().min(1),
  action: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  isTest: z.boolean().optional(),
}).passthrough();

const mcpOrderSchema = z.object({
  tool: z.string().trim().min(1),
  arguments: z.record(z.string(), z.unknown()).optional(),
});

const clientConsumerOrderSchema = z.object({
  branchId: z.string().trim().min(1),
  totalAmount: z.number(),
  customerName: z.string().trim().min(1),
  customerPhone: z.string().trim().min(1),
  paymentMethod: z.string().trim().optional().default('cash'),
  orderType: z.string().trim().optional().default('pickup'),
  source: z.string().trim().optional().default('client'),
  address: z.string().trim().optional(),
  customerLatitude: z.number().optional(),
  customerLongitude: z.number().optional(),
  scheduledFor: z.string().trim().nullable().optional(),
  optOutCutlery: z.boolean().optional(),
  tableNumber: z.string().trim().optional(),
  items: z.array(z.object({
    item_id: z.string().trim().optional(),
    productId: z.string().trim().optional(),
    id: z.string().trim().optional(),
    variantId: z.string().trim().nullable().optional(),
    variant_id: z.string().trim().nullable().optional(),
    quantity: z.number(),
    price: z.number().optional(),
    notes: z.string().optional(),
    modifiers: z.array(z.object({
      modifier_item_id: z.string().trim(),
      quantity: z.number().optional(),
    })).optional(),
  })).min(1),
});

function getRecordValue(record: Record<string, unknown>, key: string) {
  return record[key];
}

function getStringValue(record: Record<string, unknown>, key: string): string {
  const value = getRecordValue(record, key);

  return typeof value === 'string' ? value : '';
}

function getNullableStringValue(record: Record<string, unknown>, key: string): string | null {
  const value = getRecordValue(record, key);

  return typeof value === 'string' ? value : null;
}

function getUnknownNumberValue(record: Record<string, unknown>, key: string): unknown {
  return getRecordValue(record, key);
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : {};
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json().catch(() => null);

    const parsedN8nPayload = n8nOrderSchema.safeParse(payload);
    if (parsedN8nPayload.success) {
      const { isTest = false, ...n8nPayload } = parsedN8nPayload.data;
      const { response, payload: data } = await postN8nWebhook(n8nPayload, isTest);

      if (!response.ok) {
        return NextResponse.json(
          { success: false, message: 'Error al procesar la orden' },
          { status: response.status },
        );
      }

      return NextResponse.json(data);
    }

    const parsedClientConsumerPayload = clientConsumerOrderSchema.safeParse(payload);
    if (parsedClientConsumerPayload.success) {
      const body = parsedClientConsumerPayload.data;
      const supabaseServer = getSupabaseServer();
      const { data: branchRecord, error: branchError } = await (supabaseServer as any)
        .from('branches')
        .select('id, restaurant_id')
        .eq('id', body.branchId)
        .maybeSingle();

      if (branchError || !branchRecord?.restaurant_id) {
        return NextResponse.json({ success: false, message: 'Could not resolve restaurant for branch' }, { status: 400 });
      }

      const order = await createConsumerOrderLocal({
        restaurant_id: String(branchRecord.restaurant_id),
        customer_name: body.customerName,
        customer_phone: body.customerPhone,
        delivery_address: body.address || null,
        total_amount: body.totalAmount,
        order_type: String(body.orderType || 'pickup').toLowerCase(),
        source: (body.source || 'client') as 'client' | 'virtualMenu' | 'bot',
        customerLatitude: body.customerLatitude,
        customerLongitude: body.customerLongitude,
        scheduledFor: body.scheduledFor || undefined,
        optOutCutlery: Boolean(body.optOutCutlery),
        metadata: {
          branchId: body.branchId,
          tableNumber: body.tableNumber || null,
        },
        items: body.items.map((item) => ({
          item_id: item.item_id || item.productId || item.id || '',
          variant_id: item.variantId || item.variant_id || undefined,
          quantity: item.quantity,
          notes: item.notes || undefined,
          modifiers: (item.modifiers || []).map((modifier) => ({
            modifier_item_id: modifier.modifier_item_id,
            quantity: modifier.quantity || 1,
          })),
        })),
      });

      return NextResponse.json({
        success: true,
        data: { order },
        message: 'Pedido creado exitosamente',
      }, { status: 201 });
    }

    // Ensure branchId is correctly set in arguments if missing
    const parsedMcpPayload = mcpOrderSchema.safeParse(payload);
    if (!parsedMcpPayload.success) {
      return NextResponse.json({ success: false, message: 'Invalid order payload' }, { status: 400 });
    }

    const cookieStore = await cookies();
    const sessionBranchId = cookieStore.get('session_branch_id')?.value;
    const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;
    const branchIdToUse = sessionBranchId || DEFAULT_BRANCH_ID;

    let finalBody = parsedMcpPayload.data;
    if (finalBody?.arguments && (!finalBody.arguments.branchId || finalBody.arguments.branchId === ':branchId')) {
      if (branchIdToUse) {
        finalBody.arguments.branchId = branchIdToUse;
      }
    }

    const isToolPayload =
      finalBody && typeof finalBody === 'object' && 'tool' in finalBody;

    if (isToolPayload && finalBody.tool === 'create_branch_order' && finalBody.arguments) {
      const args = finalBody.arguments;
      const customer = typeof args.customer === 'object' && args.customer !== null
        ? (args.customer as Record<string, unknown>)
        : {};
      const normalizedCustomerPhone = String(
        getStringValue(customer, 'phone') ||
        getStringValue(customer, 'fromNumber') ||
        getStringValue(args, 'customerPhone') ||
        getStringValue(args, 'customer_phone') ||
        getStringValue(args, 'phone') ||
        getStringValue(args, 'fromNumber') ||
        ''
      ).trim();
      const paymentMethodRaw = String(getRecordValue(args, 'payment_method_code') || getRecordValue(args, 'paymentMethod') || 'CASH').toLowerCase();
      const paymentMethodCode =
        paymentMethodRaw === 'cash' ? 'CASH' :
        paymentMethodRaw === 'card' ? 'CARD' :
        paymentMethodRaw === 'sinpe' ? 'SINPE' :
        String(getRecordValue(args, 'payment_method_code') || getRecordValue(args, 'paymentMethod') || 'CASH').toUpperCase();

      const serviceModeRaw = String(getRecordValue(args, 'service_mode') || getRecordValue(args, 'orderType') || 'pickup').toLowerCase();
      const serviceMode =
        serviceModeRaw === 'delivery' || serviceModeRaw === 'domicilio' ? 'delivery' :
        serviceModeRaw === 'dine_in' || serviceModeRaw === 'comer_ahi' || serviceModeRaw === 'comer_aqui' ? 'dine_in' :
        'pickup';

      finalBody.arguments = {
        branch_id: getRecordValue(args, 'branch_id') || getRecordValue(args, 'branchId'),
        customer: {
          name: getStringValue(customer, 'name') || getStringValue(args, 'customerName'),
          phone: normalizedCustomerPhone,
          email: getNullableStringValue(customer, 'email') || getNullableStringValue(args, 'customerEmail'),
          address: getNullableStringValue(customer, 'address') || getNullableStringValue(args, 'address'),
          latitude: getUnknownNumberValue(args, 'customerLatitude') ?? getUnknownNumberValue(args, 'customer_latitude') ?? getUnknownNumberValue(customer, 'latitude') ?? null,
          longitude: getUnknownNumberValue(args, 'customerLongitude') ?? getUnknownNumberValue(args, 'customer_longitude') ?? getUnknownNumberValue(customer, 'longitude') ?? null,
        },
        items: Array.isArray(args.items)
          ? args.items.map((item: any) => ({
              menu_item_id: item.menu_item_id || item.menuItemId || item.productId || item.id,
              quantity: item.quantity,
              special_instructions: item.special_instructions || item.specialInstructions || item.notes || null,
            }))
          : [],
        payment_method_code: paymentMethodCode,
        service_mode: serviceMode,
        table_number: getRecordValue(args, 'table_number') || getRecordValue(args, 'tableNumber') || null,
        delivery_address: getNullableStringValue(args, 'delivery_address') || getNullableStringValue(args, 'address'),
        notes: getNullableStringValue(args, 'notes'),
        source: getStringValue(args, 'source') || 'client',
        delivery_enabled: serviceMode === 'delivery',
        allow_delivery_auction: serviceMode === 'delivery',
      };
    }

    if (!isToolPayload || finalBody.tool !== 'create_branch_order' || !finalBody.arguments) {
      return NextResponse.json(
        { success: false, message: 'Unsupported order payload' },
        { status: 400 },
      );
    }

    const supabaseServer = getSupabaseServer();
    const branchId = String(finalBody.arguments.branch_id || finalBody.arguments.branchId || '').trim();

    if (!branchId) {
      return NextResponse.json({ success: false, message: 'branch_id is required' }, { status: 400 });
    }

    const { data: branchRecord, error: branchError } = await (supabaseServer as any)
      .from('branches')
      .select('id, restaurant_id')
      .eq('id', branchId)
      .maybeSingle();

    if (branchError || !branchRecord?.restaurant_id) {
      return NextResponse.json({ success: false, message: 'Could not resolve restaurant for branch' }, { status: 400 });
    }

    const rpcResult = await createBranchOrderRpcLocal({
      branchId,
      restaurantId: String(branchRecord.restaurant_id),
      customer: {
        name: getStringValue(asRecord(finalBody.arguments.customer), 'name') || getStringValue(finalBody.arguments, 'customerName') || 'Cliente',
        phone: getStringValue(asRecord(finalBody.arguments.customer), 'phone') || getStringValue(finalBody.arguments, 'customerPhone') || getStringValue(finalBody.arguments, 'phone'),
        email: getNullableStringValue(asRecord(finalBody.arguments.customer), 'email') || getNullableStringValue(finalBody.arguments, 'customerEmail'),
        address: getNullableStringValue(asRecord(finalBody.arguments.customer), 'address') || getNullableStringValue(finalBody.arguments, 'delivery_address') || getNullableStringValue(finalBody.arguments, 'address'),
      },
      items: Array.isArray(finalBody.arguments.items)
        ? finalBody.arguments.items.map((item: any) => ({
            menu_item_id: String(item.menu_item_id || item.menuItemId || item.productId || item.id || ''),
            quantity: Number(item.quantity || 1),
            special_instructions: item.special_instructions || item.specialInstructions || item.notes || null,
          }))
        : [],
      paymentMethodCode: String(finalBody.arguments.payment_method_code || finalBody.arguments.paymentMethod || 'CASH').toUpperCase(),
      serviceMode: (String(finalBody.arguments.service_mode || finalBody.arguments.orderType || 'pickup').toLowerCase() === 'delivery'
        ? 'delivery'
        : String(finalBody.arguments.service_mode || finalBody.arguments.orderType || 'pickup').toLowerCase() === 'dine_in'
          ? 'dine_in'
          : 'pickup') as 'pickup' | 'delivery' | 'dine_in' | 'takeaway',
      deliveryAddress: getNullableStringValue(finalBody.arguments, 'delivery_address') || getNullableStringValue(finalBody.arguments, 'address'),
      notes: getNullableStringValue(finalBody.arguments, 'notes'),
      tableNumber: finalBody.arguments.table_number ? Number(finalBody.arguments.table_number) : (finalBody.arguments.tableNumber ? Number(finalBody.arguments.tableNumber) : null),
    });

    return NextResponse.json(rpcResult);
  } catch (error) {
    console.error("[API/Orders] Fatal Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unexpected order error' },
      { status: 500 },
    );
  }
}



