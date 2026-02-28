import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getTraceId } from '../_lib';

const dietaryCheckSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        is_safe: { type: Type.BOOLEAN },
        confidence: { type: Type.NUMBER, description: 'A score between 0 and 1 indicating certainty' },
        reason: { type: Type.STRING, description: 'A short, 1-2 sentence explanation' },
        estimated_macros: {
            type: Type.OBJECT,
            properties: {
                protein: { type: Type.NUMBER, description: 'Estimated protein in grams' },
                carbs: { type: Type.NUMBER, description: 'Estimated carbohydrates in grams' },
                fat: { type: Type.NUMBER, description: 'Estimated fat in grams' }
            }
        }
    },
    required: ["is_safe", "confidence", "reason"]
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const traceId = getTraceId(req.headers.get('x-trace-id'));

    try {
        const body = await req.json();
        const { menu_item, dietary_profile } = body;

        if (!menu_item || !dietary_profile) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.dietary-check] GEMINI_API_KEY is missing, returning explicit unavailable status.');
            return NextResponse.json({
                status: 'provider_unavailable',
                reason: 'ai_provider_not_configured',
                source: 'none',
                traceId
            }, { status: 503 });
        }

        if (!Array.isArray(menu_item.ingredients) || menu_item.ingredients.length === 0) {
            return NextResponse.json({
                status: 'incomplete_data',
                reason: 'menu_item_ingredients_unavailable',
                source: 'db',
                traceId
            }, { status: 422 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are a strict Dietary Guardian for the FastEat application in Costa Rica.
Your job is to validate a menu item against a user's dietary profile to ensure it is safe for them to eat.

User's strict dietary rules: ${JSON.stringify(dietary_profile)}

Menu Item to evaluate:
Name: ${menu_item.name}
Description: ${menu_item.description || 'Unknown'}
Ingredients: ${menu_item.ingredients?.join(', ') || 'Unknown'}

Determine if this item is completely safe, definitively unsafe, or if a warning is required. Be strict. If unsure about cross-contamination or hidden ingredients based on typical Costa Rican recipes for this item, reduce your confidence score and explain the concern.
Analyze the item and return strictly the structured output required. All explanations MUST be in Costa Rican Spanish.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: dietaryCheckSchema,
            }
        });

        if (!response.text) {
            throw new Error('No text returned from Gemini');
        }

        const resultObject = JSON.parse(response.text) as {
            is_safe?: boolean;
            confidence?: number;
            reason?: string;
            estimated_macros?: {
                protein?: number;
                carbs?: number;
                fat?: number;
            };
        };

        if (typeof resultObject.is_safe !== 'boolean' || typeof resultObject.confidence !== 'number' || typeof resultObject.reason !== 'string') {
            return NextResponse.json({
                status: 'analysis_unavailable',
                reason: 'invalid_provider_payload',
                source: 'ai',
                traceId
            }, { status: 502 });
        }

        return NextResponse.json({
            ...resultObject,
            status: 'analyzed',
            source: 'ai',
            traceId
        });
    } catch (error) {
        console.error('[discovery.dietary-check.error]', { traceId, error });
        return NextResponse.json(
            {
                status: 'analysis_unavailable',
                reason: 'dietary_check_processing_failed',
                source: 'none',
                traceId
            },
            { status: 500 }
        );
    }
}
