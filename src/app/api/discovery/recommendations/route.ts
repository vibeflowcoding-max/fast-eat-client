import { NextRequest, NextResponse } from 'next/server';
import {
    buildRecommendationItems,
    buildRecommendationRails,
    getCachedRecommendations,
    getGeneratedAt,
    getRestaurantRows,
    getStrategyVersion,
    getTraceId,
    isDiscoveryRecommendationsResponseShape,
    isConstraints,
    isLocationContext,
    setCachedRecommendations
} from '../_lib';
import { DiscoveryIntent } from '@/features/home-discovery/types';

export const dynamic = 'force-dynamic';

type RequestBody = {
    location?: unknown;
    constraints?: unknown;
    intent?: DiscoveryIntent;
    limit?: number;
};

export async function POST(request: NextRequest) {
    const traceId = getTraceId(request.headers.get('x-trace-id'));

    try {
        const body = (await request.json()) as RequestBody;

        if (body.location !== undefined && !isLocationContext(body.location)) {
            return NextResponse.json({ error: 'Invalid location context', traceId }, { status: 400 });
        }

        if (body.constraints !== undefined && !isConstraints(body.constraints)) {
            return NextResponse.json({ error: 'Invalid constraints', traceId }, { status: 400 });
        }

        if (body.limit !== undefined && (typeof body.limit !== 'number' || body.limit <= 0 || body.limit > 50)) {
            return NextResponse.json({ error: 'Invalid limit value', traceId }, { status: 400 });
        }

        const cacheKey = JSON.stringify({
            location: body.location,
            constraints: body.constraints,
            intent: body.intent,
            limit: body.limit
        });

        const cached = getCachedRecommendations(cacheKey);
        if (cached) {
            console.info('[discovery.recommendations.cache-hit]', { traceId, strategyVersion: cached.strategyVersion });
            return NextResponse.json({ ...cached, traceId, cached: true });
        }

        const restaurants = await getRestaurantRows();
        const recommendations = buildRecommendationItems({
            restaurants,
            intent: body.intent,
            location: body.location,
            constraints: body.constraints,
            limit: body.limit ?? 12
        });

        const payload = {
            rails: buildRecommendationRails(recommendations),
            generatedAt: getGeneratedAt(),
            strategyVersion: getStrategyVersion()
        };

        if (!isDiscoveryRecommendationsResponseShape(payload)) {
            return NextResponse.json({ error: 'Invalid recommendations response', traceId }, { status: 500 });
        }

        setCachedRecommendations(cacheKey, payload);

        console.info('[discovery.recommendations.success]', {
            traceId,
            rails: payload.rails.length,
            strategyVersion: payload.strategyVersion
        });

        return NextResponse.json({ ...payload, traceId, cached: false });
    } catch (error) {
        console.error('[discovery.recommendations.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to build recommendations', traceId }, { status: 500 });
    }
}
