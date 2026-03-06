import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { z } from 'zod';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';
import { postN8nWebhook } from '@/app/api/_server/upstreams/n8n';

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

    const ORDER_PATH = '/mcp/order';

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

    const upstreamBody = isToolPayload
      ? {
          jsonrpc: '2.0',
          id: `order-${Date.now()}`,
          method: 'tools/call',
          params: {
            name: finalBody.tool,
            arguments: finalBody.arguments ?? {},
          },
        }
      : finalBody;

    try {
      const { response, payload: data } = await fetchFastEat(ORDER_PATH, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(upstreamBody),
      }, 55000);

      if (!response.ok) {
        return NextResponse.json(
          { success: false, message: getSafeUpstreamErrorMessage(data, 'Error al procesar la orden') },
          { status: response.status },
        );
      }

      if (isToolPayload && data?.result?.content?.[0]?.text) {
        try {
          const parsedToolResult = JSON.parse(data.result.content[0].text);
          return NextResponse.json(parsedToolResult);
        } catch {
          return NextResponse.json(data);
        }
      }

      if (data?.error) {
        return NextResponse.json(
          {
            success: false,
            message: data.error?.message || 'Error al procesar la orden',
          },
          { status: 400 },
        );
      }

      return NextResponse.json(data);
    } catch (fetchError: unknown) {
      if (fetchError instanceof Error && fetchError.name === 'AbortError') {
        console.warn("[API/Orders] Request timed out after 55s");
        return NextResponse.json({ 
          success: false, 
          message: "El servidor está tardando en responder, pero es posible que tu orden se esté procesando. Por favor, espera un momento antes de reintentar." 
        }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error) {
    console.error("[API/Orders] Fatal Error:", error);
    return NextResponse.json(
      { success: false, message: error instanceof Error ? error.message : 'Unexpected order error' },
      { status: 500 },
    );
  }
}



