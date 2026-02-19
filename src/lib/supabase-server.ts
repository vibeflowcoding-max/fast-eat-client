import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

let missingCredentialsWarned = false;
let supabaseServerInstance: ReturnType<typeof createClient> | null = null;

function assertSupabaseServerCredentials() {
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    if (!missingCredentialsWarned) {
      console.warn('Server Supabase credentials missing. Some API write routes may fail.');
      missingCredentialsWarned = true;
    }

    throw new Error('Missing Supabase server credentials. Configure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
  }
}

export function getSupabaseServer() {
  if (supabaseServerInstance) {
    return supabaseServerInstance;
  }

  assertSupabaseServerCredentials();

  supabaseServerInstance = createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });

  return supabaseServerInstance;
}
