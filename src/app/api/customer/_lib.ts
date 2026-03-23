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

// ⚡ Bolt: Phone matches helper now accepts a pre-computed Set of input phone candidates
// and a normalization cache. This prevents redundant regex parsing and allocations.
function phoneMatchesOptimized(
  inputCandidates: Set<string>,
  storedPhone: unknown,
  normalizationCache: Map<string, { raw: string; digits: string }>
): boolean {
  if (typeof storedPhone !== 'string' || !storedPhone.trim()) {
    return false;
  }

  // First check if the exact string matches any candidate.
  // This is very fast and covers most matches since database queries already filter for candidates.
  if (inputCandidates.has(storedPhone)) {
    return true;
  }

  let normalized = normalizationCache.get(storedPhone);
  if (!normalized) {
    const raw = normalizePhoneRaw(storedPhone);
    const digits = normalizePhoneDigits(raw);
    normalized = { raw, digits };
    normalizationCache.set(storedPhone, normalized);
  }

  const { raw, digits } = normalized;

  if (inputCandidates.has(raw) || inputCandidates.has(digits)) {
    return true;
  }

  if (digits.length > 8 && inputCandidates.has(digits.slice(-8))) {
    return true;
  }

  if (digits.startsWith('506') && digits.length > 3 && inputCandidates.has(digits.slice(3))) {
    return true;
  }

  return false;
}

function findBestCustomerMatch<T extends Record<string, any>>(
  data: T[],
  inputCandidatesSet: Set<string>,
  predicate?: (row: T) => boolean
): T | null {
  const normalizationCache = new Map<string, { raw: string; digits: string }>();

  // To maintain the same priority as the original multi-pass logic, we search column by column.
  // Original: for (const column of CUSTOMER_PHONE_COLUMNS) { data.find(...) }
  // This means if ANY row matches on the first column, it's preferred over ANY row matching on the second.
  for (const column of CUSTOMER_PHONE_COLUMNS) {
    for (const row of data) {
      if (predicate && !predicate(row)) {
        continue;
      }
      if (phoneMatchesOptimized(inputCandidatesSet, row[column], normalizationCache)) {
        return row;
      }
    }
  }

  return null;
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

function sanitizePostgrestValue(value: string): string {
  // PostgREST or() filter requires double quotes for values that contain special characters.
  // We should also escape any double quotes within the value by doubling them.
  return `"${value.replace(/"/g, '""')}"`;
}

export async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const supabaseServer = getSupabaseServer();
  const candidates = Array.from(buildPhoneCandidates(phone));

  if (candidates.length === 0) {
    return null;
  }

  const orCondition = CUSTOMER_PHONE_COLUMNS.map((column) => {
    return candidates.map((c) => `${column}.eq.${sanitizePostgrestValue(c)}`).join(',');
  }).join(',');

  const { data, error } = await (supabaseServer as any)
    .from('customers')
    .select(`id,${CUSTOMER_PHONE_COLUMNS.join(',')}`)
    .or(orCondition)
    // TODO: Consider removing or justifying the 2000-row limit in the future.
    // As the dataset grows, this could lead to false negatives.
    // Potential improvements: better indexing or exact-match query paths.
    .limit(2000);

  if (error || !Array.isArray(data)) {
    return null;
  }

  // ⚡ Bolt: Use optimized single-pass search with normalization caching.
  // Pre-computing input candidates and caching row normalizations reduces execution time.
  const inputCandidatesSet = buildPhoneCandidates(phone);
  const found = findBestCustomerMatch(data, inputCandidatesSet, hasId);

  if (found && hasId(found)) {
    return String(found.id);
  }

  return null;
}

export async function findCustomerByPhone(phone: string): Promise<Record<string, unknown> | null> {
  const supabaseServer = getSupabaseServer();
  const candidates = Array.from(buildPhoneCandidates(phone));

  if (candidates.length === 0) {
    return null;
  }

  const orCondition = CUSTOMER_PHONE_COLUMNS.map((column) => {
    return candidates.map((c) => `${column}.eq.${sanitizePostgrestValue(c)}`).join(',');
  }).join(',');

  const { data, error } = await (supabaseServer as any)
    .from('customers')
    .select('*')
    .or(orCondition)
    // TODO: Consider removing or justifying the 2000-row limit in the future.
    // As the dataset grows, this could lead to false negatives.
    // Potential improvements: better indexing or exact-match query paths.
    .limit(2000);

  if (error || !Array.isArray(data)) {
    return null;
  }

  // ⚡ Bolt: Use optimized single-pass search with normalization caching.
  // Pre-computing input candidates and caching row normalizations reduces execution time.
  const inputCandidatesSet = buildPhoneCandidates(phone);
  const found = findBestCustomerMatch(data, inputCandidatesSet);

  if (found && typeof found === 'object') {
    return found as Record<string, unknown>;
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
