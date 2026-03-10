import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  autocompletePlacesPayload,
  geocodeAddressPayload,
  getDirectionsPayload,
  getMapsConfigPayload,
  getPlaceDetailsPayload,
  reverseGeocodePayload,
} from '@/server/maps/google';

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

export async function GET(request: NextRequest) {
  try {
    const parsed = getActionSchema.safeParse(Object.fromEntries(request.nextUrl.searchParams.entries()));
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid maps request' }, { status: 400 });
    }

    const { action, input, placeId, lat, lng, radius, language } = parsed.data;

    if (action === 'config') {
      return NextResponse.json({ success: true, data: await getMapsConfigPayload() });
    }

    if (action === 'autocomplete') {
      if (!input) {
        return NextResponse.json({ error: 'input is required' }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        data: await autocompletePlacesPayload({ input, lat, lng, radius, language }),
      });
    }

    if (!placeId) {
      return NextResponse.json({ error: 'placeId is required' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      data: await getPlaceDetailsPayload(placeId, language),
    });
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

    switch (parsed.data.action) {
      case 'geocode':
        return NextResponse.json({
          success: true,
          data: await geocodeAddressPayload(parsed.data.address, parsed.data.language, parsed.data.region),
        });
      case 'reverse-geocode':
        return NextResponse.json({
          success: true,
          data: await reverseGeocodePayload(parsed.data.lat, parsed.data.lng, parsed.data.language),
        });
      case 'directions':
        return NextResponse.json({
          success: true,
          data: await getDirectionsPayload(parsed.data.origin, parsed.data.destination, parsed.data.mode ?? 'driving'),
        });
    }
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Maps request failed' },
      { status: 500 },
    );
  }
}