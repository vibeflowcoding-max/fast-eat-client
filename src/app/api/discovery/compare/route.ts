import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getStrategyVersion, getTraceId, isDiscoveryCompareResponseShape, isLocationContext, isObject } from '../_lib';

export const dynamic = 'force-dynamic';

type CompareItem = {
    restaurantId: string;
    itemIds: string[];
};

type CompareRequestBody = {
    items: CompareItem[];
    location?: unknown;
};

interface BranchRow {
    id: string;
    estimated_delivery_fee: number | null;
}

interface RestaurantRow {
    id: string;
    name: string;
    avg_price_estimate: number | null;
    estimated_delivery_fee: number | null;
    promo_text: string | null;
    branches: BranchRow[];
}

interface DealRow {
    branch_id: string;
    discount_type: 'percentage' | 'fixed';
    discount_value: number | string;
    starts_at: string | null;
    ends_at: string | null;
    created_at: string | null;
}

interface FeeRuleRow {
    branch_id: string;
    delivery_fee: number | string;
    service_fee: number | string;
    platform_fee: number | string;
}

function toNumber(value: unknown): number | null {
    if (typeof value === 'number' && Number.isFinite(value)) {
        return value;
    }

    if (typeof value === 'string') {
        const parsed = Number(value);
        return Number.isFinite(parsed) ? parsed : null;
    }

    return null;
}

function isDealActiveNow(deal: Pick<DealRow, 'starts_at' | 'ends_at'>) {
    const now = Date.now();
    const startsAt = deal.starts_at ? Date.parse(deal.starts_at) : null;
    const endsAt = deal.ends_at ? Date.parse(deal.ends_at) : null;

    if (startsAt && Number.isFinite(startsAt) && startsAt > now) {
        return false;
    }

    if (endsAt && Number.isFinite(endsAt) && endsAt < now) {
        return false;
    }

    return true;
}

function isCompareItem(value: unknown): value is CompareItem {
    if (!isObject(value)) {
        return false;
    }

    return (
        typeof value.restaurantId === 'string' &&
        Array.isArray(value.itemIds) &&
        value.itemIds.every((itemId) => typeof itemId === 'string')
    );
}

export async function POST(request: NextRequest) {
    const traceId = getTraceId(request.headers.get('x-trace-id'));

    try {
        const body = (await request.json()) as CompareRequestBody;

        if (!Array.isArray(body.items) || body.items.length === 0 || body.items.length > 10) {
            return NextResponse.json({ error: 'Invalid compare items', traceId }, { status: 400 });
        }

        if (!body.items.every(isCompareItem)) {
            return NextResponse.json({ error: 'Invalid compare item shape', traceId }, { status: 400 });
        }

        if (body.location !== undefined && !isLocationContext(body.location)) {
            return NextResponse.json({ error: 'Invalid location context', traceId }, { status: 400 });
        }

        const ids = body.items.map((item) => item.restaurantId);

        const { data: restaurants, error } = await supabase
            .from('restaurants')
            .select(`
                id,
                name,
                avg_price_estimate,
                estimated_delivery_fee,
                promo_text,
                branches!inner (
                    id,
                    estimated_delivery_fee
                )
            `)
            .in('id', ids);

        if (error) {
            throw new Error(error.message);
        }

        const restaurantRows = (restaurants ?? []) as unknown as RestaurantRow[];

        const branchIds = restaurantRows
            .flatMap((restaurant) => restaurant.branches || [])
            .map((branch) => branch.id)
            .filter(Boolean);

        const [dealsResult, feeRulesResult] = branchIds.length > 0
            ? await Promise.all([
                supabase
                    .from('deals')
                    .select('branch_id,discount_type,discount_value,starts_at,ends_at,created_at')
                    .in('branch_id', branchIds)
                    .eq('active', true),
                supabase
                    .from('fee_rules')
                    .select('branch_id,delivery_fee,service_fee,platform_fee')
                    .in('branch_id', branchIds)
                    .eq('active', true)
            ])
            : [{ data: [] as DealRow[] }, { data: [] as FeeRuleRow[] }];

        const activeDeals = ((dealsResult.data ?? []) as DealRow[])
            .filter((deal) => isDealActiveNow(deal))
            .sort((left, right) => {
                const leftCreatedAt = left.created_at ? Date.parse(left.created_at) : 0;
                const rightCreatedAt = right.created_at ? Date.parse(right.created_at) : 0;
                return rightCreatedAt - leftCreatedAt;
            });

        const dealByBranch = activeDeals.reduce((acc, deal) => {
            if (!acc.has(deal.branch_id)) {
                acc.set(deal.branch_id, deal);
            }
            return acc;
        }, new Map<string, DealRow>());

        const feeByBranch = ((feeRulesResult.data ?? []) as FeeRuleRow[]).reduce((acc, row) => {
            const deliveryFee = toNumber(row.delivery_fee) ?? 0;
            const serviceFee = toNumber(row.service_fee) ?? 0;
            const platformFee = toNumber(row.platform_fee) ?? 0;
            const totalFee = deliveryFee + serviceFee + platformFee;

            const current = acc.get(row.branch_id);
            if (current === undefined || totalFee < current) {
                acc.set(row.branch_id, totalFee);
            }

            return acc;
        }, new Map<string, number>());

        const restaurantMap = new Map(restaurantRows.map((row) => [row.id, row]));

        const options = body.items.map((item, index) => {
            const row = restaurantMap.get(item.restaurantId);
            const itemCount = Math.max(1, item.itemIds.length);

            const basePriceSeed = 4200 + itemCount * 700;
            const basePrice = toNumber(row?.avg_price_estimate) ?? basePriceSeed;

            const branchFees = (row?.branches || [])
                .map((branch) => toNumber(branch.estimated_delivery_fee) ?? feeByBranch.get(branch.id) ?? null)
                .filter((value): value is number => typeof value === 'number' && Number.isFinite(value));

            const deliveryFee = branchFees.length > 0
                ? Math.min(...branchFees)
                : 650;

            const promoDeal = (row?.branches || [])
                .map((branch) => dealByBranch.get(branch.id))
                .find(Boolean);

            let discount = 0;
            if (promoDeal?.discount_type === 'percentage') {
                discount = Math.round(basePrice * ((toNumber(promoDeal.discount_value) ?? 0) / 100));
            } else if (promoDeal?.discount_type === 'fixed') {
                discount = Math.round(toNumber(promoDeal.discount_value) ?? 0);
            } else if (row?.promo_text) {
                discount = Math.round(basePrice * 0.06);
            }

            discount = Math.max(0, discount);

            const platformFee = Math.round(basePrice * 0.04);
            const finalPrice = basePrice + deliveryFee + platformFee - discount;

            return {
                restaurantId: item.restaurantId,
                label: row?.name ?? `Restaurant ${index + 1}`,
                basePrice,
                deliveryFee,
                platformFee,
                discount,
                finalPrice,
                etaMin: 20 + index * 4
            };
        }).sort((left, right) => left.finalPrice - right.finalPrice);

        const responseBody = {
            comparison: {
                title: 'Price comparison across restaurants',
                options
            },
            traceId,
            strategyVersion: getStrategyVersion()
        };

        if (!isDiscoveryCompareResponseShape(responseBody)) {
            return NextResponse.json({ error: 'Invalid compare response', traceId }, { status: 500 });
        }

        console.info('[discovery.compare.success]', {
            traceId,
            options: options.length,
            strategyVersion: responseBody.strategyVersion
        });

        return NextResponse.json(responseBody);
    } catch (error) {
        console.error('[discovery.compare.error]', { traceId, error });
        return NextResponse.json({ error: 'Failed to compare options', traceId }, { status: 500 });
    }
}
