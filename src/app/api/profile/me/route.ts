import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabaseServer } from '@/lib/supabase-server';
import { normalizePhoneWithSinglePlus } from '@/lib/phone';

export const dynamic = 'force-dynamic';

const profilePutSchema = z.object({
  fullName: z.string({ required_error: 'fullName is required' }).trim().min(1, 'fullName is required').max(100, 'fullName cannot exceed 100 characters'),
  phone: z.string({ required_error: 'phone is required' }).trim().min(1, 'phone is required').max(20, 'phone cannot exceed 20 characters'),
  urlGoogleMaps: z.string().trim().max(500, 'urlGoogleMaps cannot exceed 500 characters').nullable().optional()
});

const profilePatchSchema = z.object({
  urlGoogleMaps: z.string().trim().max(500, 'urlGoogleMaps cannot exceed 500 characters').nullable().optional()
});

function normalizeMapsUrl(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

async function resolveAuthenticatedUserId(request: NextRequest): Promise<string | null> {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';

  if (!token) {
    return null;
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await supabaseServer.auth.getUser(token);
  if (error || !data?.user?.id) {
    return null;
  }

  return data.user.id;
}

export async function GET(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseServer = getSupabaseServer();
    const { data, error } = await (supabaseServer as any)
      .from('user_profiles')
      .select('user_id, email, full_name, phone, url_google_maps')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      profile: data
        ? {
            userId: data.user_id,
            email: data.email,
            fullName: data.full_name,
            phone: normalizePhoneWithSinglePlus(data.phone),
            urlGoogleMaps: normalizeMapsUrl(data.url_google_maps),
          }
        : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not load profile' },
      { status: 500 },
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = profilePutSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || 'Invalid request payload' }, { status: 400 });
    }

    const fullName = parsedBody.data.fullName;
    const phone = normalizePhoneWithSinglePlus(parsedBody.data.phone);
    const hasUrlGoogleMaps = Object.prototype.hasOwnProperty.call(rawBody || {}, 'urlGoogleMaps');
    const urlGoogleMaps = normalizeMapsUrl(parsedBody.data.urlGoogleMaps);

    if (!phone) {
      return NextResponse.json({ error: 'Valid phone is required' }, { status: 400 });
    }

    const supabaseServer = getSupabaseServer();
    const updatePayload: Record<string, unknown> = {
      full_name: fullName,
      phone,
    };

    if (hasUrlGoogleMaps) {
      updatePayload.url_google_maps = urlGoogleMaps;
    }

    const { data, error } = await (supabaseServer as any)
      .from('user_profiles')
      .update(updatePayload)
      .eq('user_id', userId)
      .select('user_id, email, full_name, phone, url_google_maps')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      profile: {
        userId: data.user_id,
        email: data.email,
        fullName: data.full_name,
        phone: normalizePhoneWithSinglePlus(data.phone),
        urlGoogleMaps: normalizeMapsUrl(data.url_google_maps),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update profile' },
      { status: 500 },
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const userId = await resolveAuthenticatedUserId(request);
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const rawBody = await request.json().catch(() => ({}));
    const parsedBody = profilePatchSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json({ error: parsedBody.error.issues[0]?.message || 'Invalid request payload' }, { status: 400 });
    }

    const urlGoogleMaps = normalizeMapsUrl(parsedBody.data.urlGoogleMaps);

    const supabaseServer = getSupabaseServer();
    const { data, error } = await (supabaseServer as any)
      .from('user_profiles')
      .update({
        url_google_maps: urlGoogleMaps,
      })
      .eq('user_id', userId)
      .select('user_id, email, full_name, phone, url_google_maps')
      .single();

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({
      profile: {
        userId: data.user_id,
        email: data.email,
        fullName: data.full_name,
        phone: normalizePhoneWithSinglePlus(data.phone),
        urlGoogleMaps: normalizeMapsUrl(data.url_google_maps),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Could not update profile location' },
      { status: 500 },
    );
  }
}