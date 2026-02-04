import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { body, isTest } = await req.json();
    
    const N8N_BASE_URL = process.env.N8N_BASE_URL;
    const N8N_TEST_BASE_URL = process.env.N8N_TEST_BASE_URL;
    const WEBHOOK_ID = process.env.N8N_WEBHOOK_ID;

    const url = `${isTest ? N8N_TEST_BASE_URL : N8N_BASE_URL}/${WEBHOOK_ID}`;
    console.log(`[API/Chat] Forwarding to n8n: ${url}`);

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Chat API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
