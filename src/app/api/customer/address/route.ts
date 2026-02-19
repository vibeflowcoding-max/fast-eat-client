import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { ensureCustomerByPhone } from '@/app/api/customer/_lib';

export const dynamic = 'force-dynamic';

const BUILDING_TYPES = new Set(['Apartment', 'Residential Building', 'Hotel', 'Office Building', 'Other']);

function normalizeAddressRecord(record: Record<string, any> | null) {
  if (!record) {
    return null;
  }

  const locationMetadata = record.location_metadata && typeof record.location_metadata === 'object'
    ? record.location_metadata
    : null;

  const latFromRecord = typeof record.lat === 'number'
    ? record.lat
    : typeof record.latitude === 'number'
      ? record.latitude
      : undefined;

  const lngFromRecord = typeof record.lng === 'number'
    ? record.lng
    : typeof record.longitude === 'number'
      ? record.longitude
      : undefined;

  return {
    ...record,
    lat: latFromRecord ?? (typeof locationMetadata?.lat === 'number' ? locationMetadata.lat : undefined),
    lng: lngFromRecord ?? (typeof locationMetadata?.lng === 'number' ? locationMetadata.lng : undefined),
    formatted_address:
      typeof record.formatted_address === 'string'
        ? record.formatted_address
        : typeof locationMetadata?.formattedAddress === 'string'
          ? locationMetadata.formattedAddress
          : undefined,
    place_id:
      typeof record.place_id === 'string'
        ? record.place_id
        : typeof locationMetadata?.placeId === 'string'
          ? locationMetadata.placeId
          : undefined,
  };
}

function isUnknownColumnError(error: unknown): boolean {
  const message = (error as any)?.message || '';
  const details = (error as any)?.details || '';
  const hint = (error as any)?.hint || '';
  const code = (error as any)?.code || '';
  const snapshot = `${message} ${details} ${hint} ${code}`.toLowerCase();

  return snapshot.includes('column') || snapshot.includes('schema cache') || snapshot.includes('pgrst204');
}

export async function GET(request: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer();
    const { searchParams } = new URL(request.url);
    const phone = searchParams.get('phone')?.trim();

    if (!phone) {
      return NextResponse.json({ address: null });
    }

    const { customerId } = await ensureCustomerByPhone({ phone });

    const { data, error } = await supabaseServer
      .from('customer_address')
      .select('*')
      .eq('customer_id', customerId)
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return NextResponse.json({ address: normalizeAddressRecord(data as Record<string, any> | null) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not fetch address'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabaseServer = getSupabaseServer();
    const body = await request.json();

    const phone = typeof body?.phone === 'string' ? body.phone.trim() : '';
    const fullName = typeof body?.fullName === 'string' ? body.fullName.trim() : '';
    const urlAddress = typeof body?.urlAddress === 'string' ? body.urlAddress.trim() : '';
    const buildingType = typeof body?.buildingType === 'string' ? body.buildingType.trim() : '';
    const unitDetails = typeof body?.unitDetails === 'string' ? body.unitDetails.trim() : null;
    const deliveryNotesRaw = typeof body?.deliveryNotes === 'string' ? body.deliveryNotes.trim() : '';
    const deliveryNotes = deliveryNotesRaw || 'Meet at door';
    const lat = typeof body?.lat === 'number' ? body.lat : undefined;
    const lng = typeof body?.lng === 'number' ? body.lng : undefined;
    const formattedAddress = typeof body?.formattedAddress === 'string' ? body.formattedAddress.trim() : undefined;
    const placeId = typeof body?.placeId === 'string' ? body.placeId.trim() : undefined;

    if (!phone) {
      return NextResponse.json({ error: 'phone is required' }, { status: 400 });
    }

    if (!urlAddress) {
      return NextResponse.json({ error: 'urlAddress is required' }, { status: 400 });
    }

    if (!BUILDING_TYPES.has(buildingType)) {
      return NextResponse.json({ error: 'buildingType is invalid' }, { status: 400 });
    }

    const { customerId } = await ensureCustomerByPhone({ phone, fullName });

    const baseUpsertPayload = {
      customer_id: customerId,
      url_address: urlAddress,
      building_type: buildingType,
      unit_details: unitDetails,
      delivery_notes: deliveryNotes,
      updated_at: new Date().toISOString()
    };

    const extendedPayload = {
      ...baseUpsertPayload,
      ...(typeof lat === 'number' ? { lat } : {}),
      ...(typeof lng === 'number' ? { lng } : {}),
      ...(formattedAddress ? { formatted_address: formattedAddress } : {}),
      ...(placeId ? { place_id: placeId } : {}),
      location_metadata: {
        ...(typeof lat === 'number' ? { lat } : {}),
        ...(typeof lng === 'number' ? { lng } : {}),
        ...(formattedAddress ? { formattedAddress } : {}),
        ...(placeId ? { placeId } : {}),
      },
    };

    let upsertResult = await supabaseServer
      .from('customer_address')
      .upsert(extendedPayload, { onConflict: 'customer_id' })
      .select('*')
      .single();

    if (upsertResult.error && isUnknownColumnError(upsertResult.error)) {
      upsertResult = await supabaseServer
        .from('customer_address')
        .upsert(baseUpsertPayload, { onConflict: 'customer_id' })
        .select('*')
        .single();
    }

    const { data, error } = upsertResult;

    if (error) {
      throw error;
    }

    return NextResponse.json({ address: normalizeAddressRecord(data as Record<string, any> | null) });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Could not save address'
      },
      { status: 500 }
    );
  }
}
