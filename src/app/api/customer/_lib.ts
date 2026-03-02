import { getSupabaseServer } from '@/lib/supabase-server';

const CUSTOMER_PHONE_COLUMNS = ['phone', 'phone_number', 'from_number', 'customer_phone'] as const;
const CUSTOMER_NAME_COLUMNS = ['full_name', 'name', 'customer_name'] as const;

function normalizePhoneRaw(value: string): string {
  return value.trim();
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, '');
}

function buildPhoneCandidates(phone: string): Set<string> {
  const raw = normalizePhoneRaw(phone);
  const digits = normalizePhoneDigits(raw);
  const candidates = new Set<string>();

  if (raw) {
    candidates.add(raw);
  }

  if (digits) {
    candidates.add(digits);
  }

  if (digits.length > 8) {
    candidates.add(digits.slice(-8));
  }

  if (digits.startsWith('506') && digits.length > 3) {
    candidates.add(digits.slice(3));
  }

  return candidates;
}

function phoneMatches(inputPhone: string, storedPhone: unknown): boolean {
  if (typeof storedPhone !== 'string' || !storedPhone.trim()) {
    return false;
  }

  const inputCandidates = buildPhoneCandidates(inputPhone);
  const storedRaw = normalizePhoneRaw(storedPhone);
  const storedDigits = normalizePhoneDigits(storedRaw);

  if (inputCandidates.has(storedRaw) || inputCandidates.has(storedDigits)) {
    return true;
  }

  if (storedDigits.length > 8 && inputCandidates.has(storedDigits.slice(-8))) {
    return true;
  }

  if (storedDigits.startsWith('506') && storedDigits.length > 3 && inputCandidates.has(storedDigits.slice(3))) {
    return true;
  }

  return false;
}

function hasId(value: unknown): value is { id: string | number } {
  return Boolean(
    value &&
    typeof value === 'object' &&
    'id' in value &&
    (value as { id?: unknown }).id !== undefined &&
    (value as { id?: unknown }).id !== null
  );
}

export async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const supabaseServer = getSupabaseServer();

  for (const column of CUSTOMER_PHONE_COLUMNS) {
    const { data, error } = await (supabaseServer as any)
      .from('customers')
      .select(`id,${column}`)
      .limit(2000);

    if (error || !Array.isArray(data)) {
      continue;
    }

    const found = data.find((row) => hasId(row) && phoneMatches(phone, (row as Record<string, unknown>)[column]));
    if (found && hasId(found)) {
      return String(found.id);
    }
  }

  return null;
}

export async function findCustomerByPhone(phone: string): Promise<Record<string, unknown> | null> {
  const supabaseServer = getSupabaseServer();

  for (const column of CUSTOMER_PHONE_COLUMNS) {
    const { data, error } = await (supabaseServer as any)
      .from('customers')
      .select('*')
      .limit(2000);

    if (error || !Array.isArray(data)) {
      continue;
    }

    const found = data.find((row) => phoneMatches(phone, (row as Record<string, unknown>)[column]));
    if (found && typeof found === 'object') {
      return found as Record<string, unknown>;
    }
  }

  return null;
}

export async function ensureCustomerByPhone(params: { phone: string; fullName?: string }): Promise<{ customerId: string }> {
  const supabaseServer = getSupabaseServer();
  const normalizedPhone = params.phone.trim();

  if (!normalizedPhone) {
    throw new Error('phone is required');
  }

  const existingCustomerId = await findCustomerIdByPhone(normalizedPhone);
  if (existingCustomerId) {
    return { customerId: existingCustomerId };
  }

  for (const phoneColumn of CUSTOMER_PHONE_COLUMNS) {
    for (const nameColumn of CUSTOMER_NAME_COLUMNS) {
      const candidatePayload: Record<string, string> = {
        [phoneColumn]: normalizedPhone
      };

      if (params.fullName?.trim()) {
        candidatePayload[nameColumn] = params.fullName.trim();
      }

      const { data, error } = await (supabaseServer as any)
        .from('customers')
        .insert(candidatePayload)
        .select('id')
        .single();

      if (!error && hasId(data)) {
        return { customerId: String(data.id) };
      }
    }

    const fallbackPayload = { [phoneColumn]: normalizedPhone };
    const { data, error } = await (supabaseServer as any)
      .from('customers')
      .insert(fallbackPayload)
      .select('id')
      .single();

    if (!error && hasId(data)) {
      return { customerId: String(data.id) };
    }
  }

  throw new Error('Could not create customer record for provided phone');
}

export async function ensureCustomerByAuthUser(params: {
  authUserId: string;
  email?: string | null;
  fullName?: string | null;
}): Promise<{ customerId: string }> {
  const supabaseServer = getSupabaseServer();
  const authUserId = params.authUserId.trim();

  if (!authUserId) {
    throw new Error('authUserId is required');
  }

  const { data: existingCustomer, error: existingError } = await (supabaseServer as any)
    .from('customers')
    .select('id')
    .eq('auth_user_id', authUserId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message || 'Could not query customer by auth user');
  }

  if (hasId(existingCustomer)) {
    return { customerId: String(existingCustomer.id) };
  }

  const payload: Record<string, string> = {
    auth_user_id: authUserId
  };

  if (typeof params.email === 'string' && params.email.trim()) {
    payload.email = params.email.trim();
  }

  if (typeof params.fullName === 'string' && params.fullName.trim()) {
    payload.name = params.fullName.trim();
  }

  const { data: createdCustomer, error: createError } = await (supabaseServer as any)
    .from('customers')
    .insert(payload)
    .select('id')
    .single();

  if (createError || !hasId(createdCustomer)) {
    throw new Error(createError?.message || 'Could not create customer for auth user');
  }

  return { customerId: String(createdCustomer.id) };
}
