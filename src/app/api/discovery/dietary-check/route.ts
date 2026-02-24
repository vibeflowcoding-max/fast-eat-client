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

        // Check if GEMINI_API_KEY is missing, return a deterministic mock to avoid crashing the dev environment
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.dietary-check] GEMINI_API_KEY is missing, returning mock response.');
            const name = typeof menu_item.name === 'string' ? menu_item.name.toLowerCase() : '';

            // Simple mock heuristic 
            let isSafe = true;
            let reason = 'Parece seguro basado en el nombre del producto.';

            const restrictions = JSON.stringify(dietary_profile).toLowerCase();
            if (restrictions.includes('vegan') && (name.includes('pollo') || name.includes('carne') || name.includes('queso') || name.includes('leche'))) {
                isSafe = false;
                reason = 'Contiene ingredientes de origen animal.';
            } else if (restrictions.includes('gluten') && (name.includes('pan') || name.includes('harina'))) {
                isSafe = false;
                reason = 'Contiene ingredientes con gluten.';
            }

            return NextResponse.json({
                is_safe: isSafe,
                confidence: 0.8,
                reason,
                traceId
            });
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

        const resultObject = JSON.parse(response.text);

        return NextResponse.json({
            ...resultObject,
            traceId
        });
    } catch (error) {
        console.error('[discovery.dietary-check.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to process dietary check request', traceId }, { status: 500 });
    }
}
