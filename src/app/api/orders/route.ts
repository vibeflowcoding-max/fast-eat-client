import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { target, body, isTest } = await req.json();
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
    const ORDER_PATH = '/mcp/public/order';
    const url = `${FAST_EAT_API_URL}${ORDER_PATH}`;

    // Ensure branchId is correctly set in arguments if missing
    let finalBody = body;
    if (finalBody?.arguments && (!finalBody.arguments.branchId || finalBody.arguments.branchId === ':branchId')) {
      if (branchIdToUse) {
        finalBody.arguments.branchId = branchIdToUse;
      }
    }

    console.log(`[API/Orders] Forwarding direct order to: ${url}`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 55000); // 55s timeout

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(finalBody),
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



