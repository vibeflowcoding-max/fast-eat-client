import { NextRequest, NextResponse } from 'next/server';
import {
    buildRecommendationItems,
    getRestaurantRows,
    getStrategyVersion,
    getTraceId,
    inferIntentFromQuery,
    isDiscoveryChatResponseShape,
    isConstraints,
    isLocationContext,
    isObject,
    sanitizeCompareOptions
} from '../_lib';
import { DiscoveryChatResponse } from '@/features/home-discovery/types';

export const dynamic = 'force-dynamic';

type ChatRequestBody = {
    sessionId: string;
    userId?: string;
    locale: string;
    query: string;
    history: Array<{ role: 'user' | 'assistant'; content: string }>;
    location?: unknown;
    constraints?: unknown;
    surface: 'home';
};

function isChatHistory(value: unknown): value is Array<{ role: 'user' | 'assistant'; content: string }> {
    if (!Array.isArray(value)) {
        return false;
    }

    return value.every((item) => {
        if (!isObject(item)) {
            return false;
        }

        const roleValid = item.role === 'user' || item.role === 'assistant';
        return roleValid && typeof item.content === 'string';
    });
}

function isChatRequestBody(value: unknown): value is ChatRequestBody {
    if (!isObject(value)) {
        return false;
    }

    return (
        typeof value.sessionId === 'string' &&
        typeof value.locale === 'string' &&
        typeof value.query === 'string' &&
        value.surface === 'home' &&
        isChatHistory(value.history)
    );
}

function buildFallbackAnswer(query: string, recommendationCount: number) {
    if (recommendationCount === 0) {
        return `No encontré coincidencias exactas para "${query}". Te recomiendo ajustar presupuesto o tiempo de entrega.`;
    }

    return `Encontré ${recommendationCount} opciones alineadas con "${query}". Puedes abrir comparación para ver el mejor precio final.`;
}

function buildFollowUps(query: string) {
    const inferredIntent = inferIntentFromQuery(query);

    if (inferredIntent === 'fast') {
        return ['¿También priorizamos costo bajo?', '¿Quieres comparar dos opciones rápidas?', '¿Te muestro alternativas cercanas?'];
    }

    if (inferredIntent === 'cheap' || inferredIntent === 'promotions') {
        return ['¿Agregamos filtro de entrega rápida?', '¿Prefieres combo familiar?', '¿Comparamos precio final ahora?'];
    }

    return ['¿Buscas algo económico?', '¿Prefieres entrega rápida?', '¿Quieres comparar precio total?'];
}

async function callDiscoveryWebhook(payload: ChatRequestBody, traceId: string) {
    const webhookUrl = process.env.N8N_DISCOVERY_WEBHOOK_URL;
    if (!webhookUrl) {
        return null;
    }

    const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'x-trace-id': traceId
        },
        body: JSON.stringify(payload)
    });

    if (!response.ok) {
        throw new Error(`Discovery webhook failed with status ${response.status}`);
    }

    const data = await response.json();
    if (!isObject(data)) {
        return null;
    }

    if (typeof data.answer !== 'string' || !Array.isArray(data.recommendations)) {
        return null;
    }

    const webhookResponse: DiscoveryChatResponse = {
        answer: data.answer,
        recommendations: data.recommendations,
        followUps: Array.isArray(data.followUps) ? data.followUps.filter((item) => typeof item === 'string') : [],
        compareOptions: isObject(data.compareOptions)
            ? {
                title: typeof data.compareOptions.title === 'string' ? data.compareOptions.title : 'Comparación rápida',
                options: sanitizeCompareOptions(data.compareOptions.options)
            }
            : undefined,
        traceId: typeof data.traceId === 'string' ? data.traceId : traceId
    };

    if (!isDiscoveryChatResponseShape(webhookResponse)) {
        return null;
    }

    return webhookResponse;
}

export async function POST(request: NextRequest) {
    const traceId = getTraceId(request.headers.get('x-trace-id'));

    try {
        const body = await request.json();

        if (!isChatRequestBody(body)) {
            return NextResponse.json({ error: 'Invalid discovery chat request', traceId }, { status: 400 });
        }

        if (body.location !== undefined && !isLocationContext(body.location)) {
            return NextResponse.json({ error: 'Invalid location context', traceId }, { status: 400 });
        }

        if (body.constraints !== undefined && !isConstraints(body.constraints)) {
            return NextResponse.json({ error: 'Invalid constraints', traceId }, { status: 400 });
        }

        try {
            const webhookResponse = await callDiscoveryWebhook(body, traceId);
            if (webhookResponse) {
                console.info('[discovery.chat.webhook-success]', {
                    traceId,
                    recommendations: webhookResponse.recommendations.length,
                    strategyVersion: getStrategyVersion()
                });

                return NextResponse.json(webhookResponse);
            }
        } catch (webhookError) {
            console.warn('[discovery.chat.webhook-fallback]', { traceId, webhookError });
        }

        const restaurants = await getRestaurantRows();
        const inferredIntent = inferIntentFromQuery(body.query);

        const recommendations = buildRecommendationItems({
            restaurants,
            intent: inferredIntent,
            location: body.location,
            constraints: body.constraints,
            limit: 6
        });

        const compareOptions = recommendations.slice(0, 3).map((recommendation) => ({
            restaurantId: recommendation.restaurantId,
            label: recommendation.title,
            basePrice: recommendation.basePrice ?? 0,
            deliveryFee: recommendation.estimatedDeliveryFee ?? 0,
            platformFee: Math.round((recommendation.basePrice ?? 0) * 0.04),
            discount: recommendation.discountAmount ?? 0,
            finalPrice: recommendation.finalPrice ?? 0
        }));

        const responseBody: DiscoveryChatResponse = {
            answer: buildFallbackAnswer(body.query, recommendations.length),
            recommendations,
            followUps: buildFollowUps(body.query),
            compareOptions: compareOptions.length
                ? {
                    title: 'Compare top options',
                    options: compareOptions
                }
                : undefined,
            traceId
        };

        if (!isDiscoveryChatResponseShape(responseBody)) {
            return NextResponse.json({ error: 'Invalid discovery chat response', traceId }, { status: 500 });
        }

        console.info('[discovery.chat.success]', {
            traceId,
            recommendations: responseBody.recommendations.length,
            strategyVersion: getStrategyVersion()
        });

        return NextResponse.json(responseBody);
    } catch (error) {
        console.error('[discovery.chat.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to process discovery chat', traceId }, { status: 500 });
    }
}
