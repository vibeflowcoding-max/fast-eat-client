import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(req: NextRequest) {
  try {
    const { target, body, isTest } = await req.json();
    const cookieStore = await cookies();
    
    // Get Branch ID from Session Cookie (Preferred for security)
    const sessionBranchId = cookieStore.get('session_branch_id')?.value;
    const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;
    const branchIdToUse = sessionBranchId || DEFAULT_BRANCH_ID;

    let url = "";
    const N8N_BASE_URL = process.env.N8N_BASE_URL;
    const N8N_TEST_BASE_URL = process.env.N8N_TEST_BASE_URL;
    const WEBHOOK_ID = process.env.N8N_WEBHOOK_ID;
    const FAST_EAT_API_URL = process.env.FAST_EAT_API_URL;

    // Inject branchId if missing or placeholder is used
    if (body && branchIdToUse) {
      if (!body.branch_id || body.branch_id === ':branchId') {
        if (target === 'n8n') body.branch_id = branchIdToUse;
      }
      if (body.arguments && (!body.arguments.branchId || body.arguments.branchId === ':branchId')) {
        if (target === 'fast-eat') body.arguments.branchId = branchIdToUse;
      }
    }

    if (target === 'n8n') {
      url = `${isTest ? N8N_TEST_BASE_URL : N8N_BASE_URL}/${WEBHOOK_ID}`;
    } else if (target === 'fast-eat') {
      url = `${FAST_EAT_API_URL}${body.path}`;
      delete body.path;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Proxy POST Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const target = searchParams.get('target');
  let path = searchParams.get('path');
  
  const cookieStore = await cookies();
  const sessionBranchId = cookieStore.get('session_branch_id')?.value;
  const DEFAULT_BRANCH_ID = process.env.DEFAULT_BRANCH_ID;
  const branchIdToUse = sessionBranchId || DEFAULT_BRANCH_ID;
  
  // Masking: if path contains a placeholder, replace with actual ID
  if (path && path.includes(':branchId') && branchIdToUse) {
    path = path.replace(':branchId', branchIdToUse);
  }

  if (target === 'fast-eat' && path) {
    try {
      const url = `${process.env.FAST_EAT_API_URL}${path}`;
      const response = await fetch(url);
      const data = await response.json();
      return NextResponse.json(data);
    } catch (error: any) {
      console.error("Proxy GET Error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
  }

  return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
}
