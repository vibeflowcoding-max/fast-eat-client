import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json();
    const isWrappedPayload =
      payload &&
      typeof payload === 'object' &&
      ('target' in payload || 'body' in payload || 'isTest' in payload);

    const target = isWrappedPayload ? payload.target : undefined;
    const body = isWrappedPayload ? payload.body : payload;
    const isTest = isWrappedPayload ? payload.isTest : false;
    const cookieStore = await cookies();
    
    // Get Branch ID from Session Cookie as a fallback
    const sessionBranchId = cookieStore.get('session_branch_id')?.value;
    const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;
    const branchIdToUse = sessionBranchId || DEFAULT_BRANCH_ID;

    if (target === 'n8n') {
      const N8N_BASE_URL = process.env.N8N_BASE_URL;
      const N8N_TEST_BASE_URL = process.env.N8N_TEST_BASE_URL;
      const WEBHOOK_ID = process.env.N8N_WEBHOOK_ID;
      const url = `${isTest ? N8N_TEST_BASE_URL : N8N_BASE_URL}/${WEBHOOK_ID}`;
      
      console.log(`[API/Orders] Generating order via n8n: ${url}`);
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      
      const data = await response.json();
      return NextResponse.json(data);
    }

    const FAST_EAT_API_URL = process.env.FAST_EAT_API_URL;
    const ORDER_PATH = '/mcp/order';
    const url = `${FAST_EAT_API_URL}${ORDER_PATH}`;

    // Ensure branchId is correctly set in arguments if missing
    let finalBody = body;
    if (finalBody?.arguments && (!finalBody.arguments.branchId || finalBody.arguments.branchId === ':branchId')) {
      if (branchIdToUse) {
        finalBody.arguments.branchId = branchIdToUse;
      }
    }

    const isToolPayload =
      finalBody && typeof finalBody === 'object' && 'tool' in finalBody;

    if (isToolPayload && finalBody.tool === 'create_branch_order' && finalBody.arguments) {
      const args = finalBody.arguments;
      const paymentMethodRaw = String(args.payment_method_code || args.paymentMethod || 'CASH').toLowerCase();
      const paymentMethodCode =
        paymentMethodRaw === 'cash' ? 'CASH' :
        paymentMethodRaw === 'card' ? 'CARD' :
        paymentMethodRaw === 'sinpe' ? 'SINPE' :
        String(args.payment_method_code || args.paymentMethod || 'CASH').toUpperCase();

      const serviceModeRaw = String(args.service_mode || args.orderType || 'pickup').toLowerCase();
      const serviceMode =
        serviceModeRaw === 'delivery' || serviceModeRaw === 'domicilio' ? 'delivery' :
        serviceModeRaw === 'dine_in' || serviceModeRaw === 'comer_ahi' || serviceModeRaw === 'comer_aqui' ? 'dine_in' :
        'pickup';

      finalBody.arguments = {
        branch_id: args.branch_id || args.branchId,
        customer: {
          name: args.customer?.name || args.customerName,
          phone: args.customer?.phone || args.customerPhone,
          email: args.customer?.email || args.customerEmail || null,
          address: args.customer?.address || args.address || null,
          latitude: args.customerLatitude ?? args.customer_latitude ?? args.customer?.latitude ?? null,
          longitude: args.customerLongitude ?? args.customer_longitude ?? args.customer?.longitude ?? null,
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
        table_number: args.table_number || args.tableNumber || null,
        delivery_address: args.delivery_address || args.address || null,
        notes: args.notes || null,
        source: args.source || 'client',
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

    console.log(`[API/Orders] Forwarding direct order to: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify(upstreamBody),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`[API/Orders] External API Error (${response.status}):`, errorText);
        try {
          const errorJson = JSON.parse(errorText);
          return NextResponse.json({ 
            success: false, 
            message: errorJson.message || 'Error al procesar la orden' 
          }, { status: response.status });
        } catch {
          return NextResponse.json({ success: false, message: 'Error de conexión' }, { status: response.status });
        }
      }

      const data = await response.json();

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
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      if (fetchError.name === 'AbortError') {
        console.warn("[API/Orders] Request timed out after 55s");
        return NextResponse.json({ 
          success: false, 
          message: "El servidor está tardando en responder, pero es posible que tu orden se esté procesando. Por favor, espera un momento antes de reintentar." 
        }, { status: 504 });
      }
      throw fetchError;
    }
  } catch (error: any) {
    console.error("[API/Orders] Fatal Error:", error);
    return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  }
}



