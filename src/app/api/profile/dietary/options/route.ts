import { NextResponse } from 'next/server';
import { getDietaryOptionsCatalogLocal } from '@/server/consumer/personalization';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const catalog = await getDietaryOptionsCatalogLocal();
    return NextResponse.json({ success: true, data: catalog }, { status: 200 });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'Dietary options request failed' }, { status: 500 });
  }
}