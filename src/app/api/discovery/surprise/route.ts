import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getRestaurantRows, getTraceId } from '../_lib';

const surpriseMeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        restaurantId: { type: Type.STRING },
        itemId: { type: Type.STRING },
        justification: { type: Type.STRING }
    },
    required: ["restaurantId", "itemId", "justification"]
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const traceId = getTraceId(req.headers.get('x-trace-id'));

    try {
        const body = await req.json();
        const { mood, budget, location, dietary_profile } = body;

        const restaurants = await getRestaurantRows();

        // Format restaurants context for AI
        const restaurantContext = restaurants.map(r => ({
            id: r.id,
            name: r.name,
            description: r.description,
            categories: r.restaurant_restaurant_categories.map(c =>
                Array.isArray(c.restaurant_categories)
                    ? c.restaurant_categories.map(cat => cat.name).join(', ')
                    : c.restaurant_categories?.name
            ).filter(Boolean).join(', '),
            avg_price: r.avg_price_estimate,
            rating: r.rating
        })).slice(0, 15);

        // If GEMINI_API_KEY is missing, return a deterministic mock for local development
        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.surprise] GEMINI_API_KEY is missing, returning mock response.');

            const match = restaurantContext.find(r => r.avg_price && r.avg_price <= (budget || 10000)) || restaurantContext[0];

            return NextResponse.json({
                restaurantId: match?.id ?? 'mock-id',
                itemId: 'mock-item-id',
                justification: `¡Pura vida! Basado en tu mood "${mood}", te recomiendo ${match?.name} que queda súper bien con tu presupuesto.`,
                traceId
            });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert food concierge for FastEat in Costa Rica.
A user wants a meal recommendation.
Mood: ${mood}
Budget: ₡${budget}
Dietary Restrictions: ${JSON.stringify(dietary_profile || {})}
Location: ${JSON.stringify(location || {})}

Available restaurants data: ${JSON.stringify(restaurantContext)}

Choose the single best restaurant that matches the user's mood and budget.
Since you don't have the full detailed menu, invent a plausible menu item perfectly matching the mood that this restaurant would likely sell.
Respond with strictly the restaurant ID, the invented itemId (e.g. "burger-clasica"), and a short, energetic justification in Costa Rican Spanish explaining why this hits the spot.`;

        const response = await ai.models.generateContent({
            model: 'gemini-3-flash-preview',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: surpriseMeSchema,
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
        console.error('[discovery.surprise.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to process surprise me request', traceId }, { status: 500 });
    }
}
