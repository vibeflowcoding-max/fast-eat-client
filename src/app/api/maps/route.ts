import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { fetchFastEat, getSafeUpstreamErrorMessage } from '@/app/api/_server/upstreams/fast-eat';

export const dynamic = 'force-dynamic';

const getActionSchema = z.object({
  action: z.enum(['autocomplete', 'place-details', 'config']),
  input: z.string().trim().optional(),
  placeId: z.string().trim().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  radius: z.coerce.number().optional(),
  language: z.string().trim().optional(),
});

const postActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('geocode'),
    address: z.string().trim().min(1),
    language: z.string().trim().optional(),
    region: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal('reverse-geocode'),
    lat: z.number().finite(),
    lng: z.number().finite(),
    language: z.string().trim().optional(),
  }),
  z.object({
    action: z.literal('directions'),
    origin: z.object({ lat: z.number().finite(), lng: z.number().finite() }),
    destination: z.object({ lat: z.number().finite(), lng: z.number().finite() }),
    mode: z.enum(['driving', 'walking', 'bicycling', 'transit']).optional(),
  }),
]);

function buildQueryString(params: Record<string, string | number | undefined>) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === '') {
      return;
    }

    searchParams.set(key, String(value));
  });

  const normalized = searchParams.toString();
  return normalized ? `?${normalized}` : '';
}

export async function GET(request: NextRequest) {
  try {
    const parsed = getActionSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid maps request' }, { status: 400 });
    }

    const { action, input, placeId, lat, lng, radius, language } = parsed.data;

    let upstreamPath = '/api/maps/v1/config';
    if (action === 'autocomplete') {
      if (!input) {
        return NextResponse.json({ error: 'input is required' }, { status: 400 });
      }

      upstreamPath = `/api/maps/v1/places/autocomplete${buildQueryString({ input, lat, lng, radius, language })}`;
    } else if (action === 'place-details') {
      if (!placeId) {
        return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
      }

      upstreamPath = `/api/maps/v1/places/${encodeURIComponent(placeId)}${buildQueryString({ language })}`;
    }

    const { response, payload } = await fetchFastEat(upstreamPath, { method: 'GET' });
    if (!response.ok) {
      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Maps request failed') },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Maps request failed' },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => null);
    const parsed = postActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid maps request body' }, { status: 400 });
    }

    let upstreamPath = '/api/maps/v1/geocode';
    let upstreamBody: Record<string, unknown> = {};

    switch (parsed.data.action) {
      case 'geocode':
        upstreamPath = '/api/maps/v1/geocode';
        upstreamBody = {
          address: parsed.data.address,
          language: parsed.data.language,
          region: parsed.data.region,
        };
        break;
      case 'reverse-geocode':
        upstreamPath = '/api/maps/v1/reverse-geocode';
        upstreamBody = {
          lat: parsed.data.lat,
          lng: parsed.data.lng,
          language: parsed.data.language,
        };
        break;
      case 'directions':
        upstreamPath = '/api/maps/v1/directions';
        upstreamBody = {
          origin: parsed.data.origin,
          destination: parsed.data.destination,
          mode: parsed.data.mode ?? 'driving',
        };
        break;
    }

    const { response, payload } = await fetchFastEat(upstreamPath, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(upstreamBody),
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: getSafeUpstreamErrorMessage(payload, 'Maps request failed') },
        { status: response.status },
      );
    }

    return NextResponse.json(payload);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Maps request failed' },
      { status: 500 },
    );
  }
}