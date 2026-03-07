import { getSupabaseServer } from '@/lib/supabase-server';

export interface ClientBootstrapAddressInput {
  urlAddress?: string | null;
  buildingType?: string | null;
  unitDetails?: string | null;
  deliveryNotes?: string | null;
}

export interface ClientBootstrapInput {
  fullName?: string | null;
  phone?: string | null;
  urlGoogleMaps?: string | null;
  address?: ClientBootstrapAddressInput | null;
}

const roleIdCache = new Map<string, string>();

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

async function getRoleIdByName(roleName: string): Promise<string> {
  const normalizedRole = roleName.trim();
  const cachedRoleId = roleIdCache.get(normalizedRole);

  if (cachedRoleId) {
    return cachedRoleId;
  }

  const supabaseServer = getSupabaseServer();
  const { data, error } = await (supabaseServer as any)
    .from('roles')
    .select('id')
    .eq('role', normalizedRole)
    .maybeSingle();

  if (error || !data?.id) {
    throw new Error(`No se pudo resolver el rol '${normalizedRole}'`);
  }

  roleIdCache.set(normalizedRole, String(data.id));
  return String(data.id);
}

async function ensureUserProfile(params: {
  userId: string;
  email: string;
  fullName?: string | null;
  phone?: string | null;
  urlGoogleMaps?: string | null;
}): Promise<void> {
  const supabaseServer = getSupabaseServer();
  const roleId = await getRoleIdByName('client');

  const { data: existingProfile, error: existingProfileError } = await (supabaseServer as any)
    .from('user_profiles')
    .select('created_at, role_id, phone, url_google_maps')
    .eq('user_id', params.userId)
    .maybeSingle();

  if (existingProfileError) {
    throw new Error('No se pudo validar el perfil de usuario');
  }

  const createdAtValue = existingProfile?.created_at || new Date().toISOString();
  const existingRoleId = existingProfile?.role_id || null;
  const existingPhone = normalizeText(existingProfile?.phone);
  const existingUrlGoogleMaps = normalizeText(existingProfile?.url_google_maps);
  const profilePhoneToPersist = normalizeText(params.phone) || existingPhone;
  const urlGoogleMapsToPersist = normalizeText(params.urlGoogleMaps) || existingUrlGoogleMaps;

  const { error: upsertError } = await (supabaseServer as any)
    .from('user_profiles')
    .upsert(
      {
        user_id: params.userId,
        email: params.email,
        full_name: normalizeText(params.fullName),
        phone: profilePhoneToPersist,
        url_google_maps: urlGoogleMapsToPersist,
        role_id: existingRoleId || roleId,
        created_at: createdAtValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' },
    );

  if (upsertError) {
    throw new Error('No se pudo crear el perfil de usuario');
  }
}

function isPhoneConflict(error: any): boolean {
  return Boolean(
    error?.message?.includes('customers_phone_key')
    || (error?.code === '23505' && String(error?.details || '').includes('(phone)')),
  );
}

export async function bootstrapAuthenticatedClient(params: {
  user: { id: string; email: string | null; fullName?: string | null };
  input?: ClientBootstrapInput;
}) {
  const userId = String(params.user.id || '').trim();
  const email = normalizeText(params.user.email);

  if (!userId) {
    throw new Error('Usuario no autenticado');
  }

  if (!email) {
    throw new Error('El usuario autenticado no tiene email');
  }

  const input = params.input ?? {};
  const fullName = normalizeText(input.fullName) || normalizeText(params.user.fullName) || null;
  const phone = normalizeText(input.phone) || null;
  const derivedAddress = input.address?.urlAddress
    ? {
        urlAddress: normalizeText(input.address.urlAddress),
        buildingType: normalizeText(input.address.buildingType) || 'Other',
        unitDetails: normalizeText(input.address.unitDetails),
        deliveryNotes: normalizeText(input.address.deliveryNotes) || 'Meet at door',
      }
    : normalizeText(input.urlGoogleMaps)
      ? {
          urlAddress: normalizeText(input.urlGoogleMaps),
          buildingType: 'Other',
          unitDetails: null,
          deliveryNotes: 'Meet at door',
        }
      : null;

  await ensureUserProfile({
    userId,
    email,
    fullName,
    phone,
    urlGoogleMaps: derivedAddress?.urlAddress || normalizeText(input.urlGoogleMaps),
  });

  const supabaseServer = getSupabaseServer();
  const { data: existingCustomer } = await (supabaseServer as any)
    .from('customers')
    .select('id, phone')
    .eq('auth_user_id', userId)
    .maybeSingle();

  let effectivePhone = phone || normalizeText(existingCustomer?.phone);

  if (!existingCustomer?.id && !effectivePhone) {
    const { data: existingProfile } = await (supabaseServer as any)
      .from('user_profiles')
      .select('phone')
      .eq('user_id', userId)
      .maybeSingle();

    effectivePhone = normalizeText(existingProfile?.phone);
  }

  if (!existingCustomer?.id && !effectivePhone) {
    throw new Error('Debes completar tu numero de telefono para activar tu cuenta de cliente.');
  }

  const customerPayload = {
    auth_user_id: userId,
    name: fullName || 'Cliente',
    email,
    updated_at: new Date().toISOString(),
  };

  let customer: { id: string } | null = null;
  let customerError: any = null;

  if (existingCustomer?.id) {
    const updatePayload = effectivePhone
      ? { ...customerPayload, phone: effectivePhone }
      : customerPayload;

    const updateResult = await (supabaseServer as any)
      .from('customers')
      .update(updatePayload)
      .eq('id', existingCustomer.id)
      .select('id')
      .single();

    customer = updateResult.data as { id: string } | null;
    customerError = updateResult.error;
  } else {
    const insertResult = await (supabaseServer as any)
      .from('customers')
      .insert({
        ...customerPayload,
        phone: effectivePhone,
      })
      .select('id')
      .single();

    customer = insertResult.data as { id: string } | null;
    customerError = insertResult.error;
  }

  if (customerError || !customer?.id) {
    if (isPhoneConflict(customerError)) {
      throw new Error('Ya existe una cuenta asociada a este numero de telefono');
    }

    throw new Error('No se pudo crear/actualizar el cliente');
  }

  let addressCreated = false;
  if (derivedAddress?.urlAddress) {
    const { error: addressError } = await (supabaseServer as any)
      .from('customer_address')
      .upsert(
        {
          customer_id: customer.id,
          url_address: derivedAddress.urlAddress,
          building_type: derivedAddress.buildingType,
          unit_details: derivedAddress.unitDetails || null,
          delivery_notes: derivedAddress.deliveryNotes,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'customer_id' },
      );

    if (addressError) {
      throw new Error('No se pudo guardar la direccion del cliente');
    }

    addressCreated = true;
  }

  return {
    success: true,
    data: {
      user: {
        id: userId,
        email,
        fullName,
      },
      orchestration: {
        userProfileCreated: true,
        customerCreated: !existingCustomer?.id,
        addressCreated,
        customerId: customer.id,
      },
    },
  };
}