import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenAI, Type, Schema } from '@google/genai';
import { getRestaurantRows, getTraceId } from '../_lib';
import { supabase } from '@/lib/supabase';

const surpriseMeSchema: Schema = {
    type: Type.OBJECT,
    properties: {
        restaurantId: { type: Type.STRING },
        itemId: { type: Type.STRING },
        justification: { type: Type.STRING },
        reason: { type: Type.STRING }
    },
    required: ["restaurantId", "itemId", "justification"]
};

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    const traceId = getTraceId(req.headers.get('x-trace-id'));
    const requestLocale = (req.headers.get('x-locale') ?? '').trim().toLowerCase();
    const isEnglish = requestLocale.startsWith('en');

    try {
        const body = await req.json();
        const { mood, budget, location, dietary_profile } = body;

        const restaurants = await getRestaurantRows();
        const restaurantIds = restaurants.map((restaurant) => restaurant.id);

        const { data: menuItems, error: menuError } = await supabase
            .from('menu_items')
            .select('id,name,restaurant_id,is_active')
            .eq('is_active', true)
            .in('restaurant_id', restaurantIds.length > 0 ? restaurantIds : ['00000000-0000-0000-0000-000000000000'])
            .limit(200);

        if (menuError) {
            throw new Error(menuError.message);
        }

        const itemCandidates = (menuItems ?? [])
            .filter((item: any) => typeof item?.id === 'string' && typeof item?.restaurant_id === 'string')
            .map((item: any) => ({
                id: String(item.id),
                restaurantId: String(item.restaurant_id),
                name: typeof item.name === 'string' ? item.name : ''
            }));

        if (itemCandidates.length === 0) {
            return NextResponse.json({
                status: 'incomplete_data',
                reason: 'no_actionable_menu_items',
                source: 'db',
                traceId
            }, { status: 422 });
        }

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

        if (!process.env.GEMINI_API_KEY) {
            console.warn('[discovery.surprise] GEMINI_API_KEY is missing, returning explicit unavailable status.');
            return NextResponse.json({
                status: 'provider_unavailable',
                reason: 'ai_provider_not_configured',
                source: 'none',
                traceId
            }, { status: 503 });
        }

        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const prompt = `You are an expert food concierge for FastEat in Costa Rica.
A user wants a meal recommendation.
Mood: ${mood}
Budget: ₡${budget}
Dietary Restrictions: ${JSON.stringify(dietary_profile || {})}
Location: ${JSON.stringify(location || {})}

Available restaurants data: ${JSON.stringify(restaurantContext)}
Available real menu item candidates (must pick one exactly as-is): ${JSON.stringify(itemCandidates.slice(0, 120))}

Choose the single best restaurant that matches the user's mood and budget.
You MUST choose only one restaurantId and one itemId that already exist in the provided candidates.
Do not invent any restaurantId or itemId.
Respond with strictly the selected restaurantId, selected itemId, and a short, energetic justification in ${isEnglish ? 'English' : 'Costa Rican Spanish'} explaining why this hits the spot.`;

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

        const resultObject = JSON.parse(response.text) as {
            restaurantId?: string;
            itemId?: string;
            justification?: string;
            reason?: string;
        };

        const isActionable =
            typeof resultObject.restaurantId === 'string' &&
            typeof resultObject.itemId === 'string' &&
            itemCandidates.some((item) => item.id === resultObject.itemId && item.restaurantId === resultObject.restaurantId);

        if (!isActionable) {
            return NextResponse.json({
                status: 'incomplete_data',
                reason: 'missing_or_invalid_actionable_target',
                source: 'ai',
                traceId
            }, { status: 422 });
        }

        return NextResponse.json({
            restaurantId: resultObject.restaurantId,
            itemId: resultObject.itemId,
            justification: resultObject.justification,
            status: 'actionable',
            reason: resultObject.reason ?? 'matched_real_candidate',
            source: 'ai',
            traceId
        });
    } catch (error) {
        console.error('[discovery.surprise.error]', { traceId, error });
        return NextResponse.json(
            {
                status: 'analysis_unavailable',
                reason: 'surprise_processing_failed',
                source: 'none',
                traceId
            },
            { status: 500 }
        );
    }
}
