import { getSupabaseServer } from '@/lib/supabase-server';

const CUSTOMER_PHONE_COLUMNS = ['phone', 'phone_number', 'from_number', 'customer_phone'] as const;
const CUSTOMER_NAME_COLUMNS = ['full_name', 'name', 'customer_name'] as const;

async function findCustomerIdByPhone(phone: string): Promise<string | null> {
  const supabaseServer = getSupabaseServer();

  for (const column of CUSTOMER_PHONE_COLUMNS) {
    const { data, error } = await supabaseServer
      .from('customers')
      .select('id')
      .eq(column, phone)
      .limit(1)
      .maybeSingle();

    if (!error && data?.id) {
      return data.id as string;
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

      const { data, error } = await supabaseServer
        .from('customers')
        .insert(candidatePayload)
        .select('id')
        .single();

      if (!error && data?.id) {
        return { customerId: data.id as string };
      }
    }

    const fallbackPayload = { [phoneColumn]: normalizedPhone };
    const { data, error } = await supabaseServer
      .from('customers')
      .insert(fallbackPayload)
      .select('id')
      .single();

    if (!error && data?.id) {
      return { customerId: data.id as string };
    }
  }

  throw new Error('Could not create customer record for provided phone');
}
