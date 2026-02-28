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
        prompt_message: { type: Type.STRING, description: 'Actionable short prompt, e.g., "¡Hora de tu café usual!"' },
        reason: { type: Type.STRING }
    },
    required: ["should_prompt", "confidence"]
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const traceId = getTraceId(req.headers.get('x-trace-id'));
    const requestLocale = (req.headers.get('x-locale') ?? '').trim().toLowerCase();
    const isEnglish = requestLocale.startsWith('en');

    try {
        const body = await req.json();
        const { order_history, current_time, location } = body;

        if (!Array.isArray(order_history) || order_history.length === 0) {
            return NextResponse.json({
                should_prompt: false,
                confidence: 0,
                status: 'incomplete_data',
                reason: 'order_history_unavailable',
                source: 'db',
                traceId
            });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.predictive-reorder] GEMINI_API_KEY is missing, returning explicit unavailable status.');
            return NextResponse.json({
                should_prompt: false,
                confidence: 0,
                status: 'provider_unavailable',
                reason: 'ai_provider_not_configured',
                source: 'none',
                traceId
            }, { status: 503 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are the Predictive Reorder Engine for FastEat Costa Rica.
Your job is to anticipate a user's recurring order based on their history and current context.

Current Time: ${current_time}
Location: ${JSON.stringify(location || {})}
User Order History (last 30 days): ${JSON.stringify(order_history || [])}

Analyze the history. Are there strong temporal patterns (e.g., ordering coffee every weekday at 8 AM, or pizza on Friday nights)?
If the current time and day closely match a strong pattern, return should_prompt=true, provide the restaurantId and itemId, and write a catchy, 1-line prompt_message in ${isEnglish ? 'English' : 'Costa Rican Spanish'}.
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

        const resultObject = JSON.parse(response.text) as {
            should_prompt?: boolean;
            confidence?: number;
            restaurantId?: string;
            itemId?: string;
            prompt_message?: string;
            reason?: string;
        };

        const shouldPrompt = Boolean(resultObject.should_prompt);
        const confidence = typeof resultObject.confidence === 'number' ? resultObject.confidence : 0;
        const hasActionableTarget =
            typeof resultObject.restaurantId === 'string' && resultObject.restaurantId.trim().length > 0 &&
            typeof resultObject.itemId === 'string' && resultObject.itemId.trim().length > 0;

        if (!shouldPrompt) {
            return NextResponse.json({
                should_prompt: false,
                confidence,
                status: 'no_pattern',
                reason: resultObject.reason ?? 'no_strong_pattern',
                source: 'ai',
                traceId
            });
        }

        if (!hasActionableTarget) {
            return NextResponse.json({
                should_prompt: false,
                confidence,
                status: 'incomplete_data',
                reason: 'missing_actionable_target',
                source: 'ai',
                traceId
            });
        }

        return NextResponse.json({
            should_prompt: true,
            confidence,
            restaurantId: resultObject.restaurantId,
            itemId: resultObject.itemId,
            prompt_message: resultObject.prompt_message,
            status: 'actionable',
            reason: resultObject.reason ?? 'pattern_match',
            source: 'ai',
            traceId
        });
    } catch (error) {
        console.error('[discovery.predictive-reorder.error]', { traceId, error });
        return NextResponse.json(
            {
                should_prompt: false,
                confidence: 0,
                status: 'analysis_unavailable',
                reason: 'predictive_reorder_processing_failed',
                source: 'none',
                traceId
            },
            { status: 500 }
        );
    }
}
