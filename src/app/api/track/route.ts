import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const phone = searchParams.get('phone');
  
  const cookieStore = await cookies();
  const sessionBranchId = cookieStore.get('session_branch_id')?.value;
  const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;
  const FAST_EAT_API_URL = process.env.FAST_EAT_API_URL;

  const branchId = sessionBranchId || DEFAULT_BRANCH_ID;

  console.log(`[SSE Proxy] Tracking attempt - Phone: ${phone}, Branch: ${branchId}, SessionCookie: ${!!sessionBranchId}`);

  if (!phone || !branchId || !FAST_EAT_API_URL) {
    console.error("[SSE Proxy] Missing parameters", { phone, branchId, FAST_EAT_API_URL });
    return new Response('Missing parameters or session not initialized', { status: 400 });
  }

  const targetUrl = `${FAST_EAT_API_URL}/notifications/consumer/track?branch_id=${branchId}&phone=${encodeURIComponent(phone)}`;
  console.log(`[SSE Proxy] Connecting to backend: ${targetUrl}`);

  try {
    const response = await fetch(targetUrl, {
      cache: 'no-store',
      headers: {
        'Accept': 'text/event-stream',
      }
    });
    
    if (!response.ok) {
        console.error(`[SSE Proxy] Backend error: ${response.status} ${response.statusText}`);
        return new Response(`Backend error: ${response.statusText}`, { status: response.status });
    }

    // We proxy the SSE stream
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no', // Disable buffering in some proxies (Nginx)
      },
    });
  } catch (error) {
    console.error("[SSE Proxy] Fetch error:", error);
    return new Response('Error connecting to tracker', { status: 500 });
  }
}
