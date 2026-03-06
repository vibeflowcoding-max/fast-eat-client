import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { postN8nWebhook } from '@/app/api/_server/upstreams/n8n';

const chatRequestSchema = z.object({
  message: z.string().trim().min(1),
  fromNumber: z.string().trim().optional().default(''),
  branch_id: z.string().trim().min(1),
  intencion: z.enum(['chat', 'carrito', 'generar_orden', 'get_carrito', 'delete_cart']),
  action: z.string().trim().optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
  item_id: z.union([z.string(), z.number()]).optional(),
  nombre: z.string().trim().optional(),
  cantidad: z.number().optional(),
  detalles: z.string().optional(),
  precio: z.number().optional(),
  isTest: z.boolean().optional(),
}).passthrough();

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.json().catch(() => null);
    const parsed = chatRequestSchema.safeParse(rawBody);

    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid chat request body' }, { status: 400 });
    }

    const { isTest = false, ...payload } = parsed.data;
    const { response, payload: data } = await postN8nWebhook(payload, isTest);

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Chat upstream request failed' },
        { status: response.status },
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Chat API Error' },
      { status: 500 },
    );
  }
}
