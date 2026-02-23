import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getTraceId } from '../_lib';

const predictiveReorderSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        should_prompt: { type: Type.BOOLEAN },
        confidence: { type: Type.NUMBER, description: 'A score between 0 and 1 indicating certainty' },
        restaurantId: { type: Type.STRING },
        itemId: { type: Type.STRING },
        prompt_message: { type: Type.STRING, description: 'Actionable short prompt, e.g., "¡Hora de tu café usual!"' }
    },
    required: ["should_prompt", "confidence"]
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const traceId = getTraceId(req.headers.get('x-trace-id'));

    try {
        const body = await req.json();
        const { order_history, current_time, location } = body;

        // If GEMINI_API_KEY is missing or if we just want a simple local dev mock
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.predictive-reorder] GEMINI_API_KEY is missing, returning mock response.');

            // Simple mock: if we pass a specific mock history, trigger it
            if (order_history && order_history.length > 0) {
                return NextResponse.json({
                    should_prompt: true,
                    confidence: 0.9,
                    restaurantId: order_history[0].restaurantId || 'mock-resta',
                    itemId: order_history[0].itemId || 'mock-item',
                    prompt_message: '¿Lo de siempre? ¡Pídelo con 1 clic!',
                    traceId
                });
            }

            return NextResponse.json({
                should_prompt: false,
                confidence: 0,
                traceId
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are the Predictive Reorder Engine for FastEat Costa Rica.
Your job is to anticipate a user's recurring order based on their history and current context.

Current Time: ${current_time}
Location: ${JSON.stringify(location || {})}
User Order History (last 30 days): ${JSON.stringify(order_history || [])}

Analyze the history. Are there strong temporal patterns (e.g., ordering coffee every weekday at 8 AM, or pizza on Friday nights)?
If the current time and day closely match a strong pattern, return should_prompt=true, provide the restaurantId and itemId, and write a catchy, 1-line prompt_message in Costa Rican Spanish (e.g., "¡Llegó la hora de tu Pinto mañanero!").
If there is no strong pattern, return should_prompt=false.
Be conservative: only prompt if confidence is high (>0.7).`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: predictiveReorderSchema,
            }
        });

        if (!response.text) {
            throw new Error('No text returned from Gemini');
        }

        const resultObject = JSON.parse(response.text);

        return NextResponse.json({
            ...resultObject,
            traceId
        });
    } catch (error) {
        console.error('[discovery.predictive-reorder.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to process predictive reorder request', traceId }, { status: 500 });
    }
}
