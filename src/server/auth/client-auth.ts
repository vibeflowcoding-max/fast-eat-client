import { createClient } from '@supabase/supabase-js';
import { bootstrapAuthenticatedClient, type ClientBootstrapAddressInput } from '@/server/auth/client-bootstrap';

interface SupabaseAuthUser {
  id: string;
  email?: string | null;
  created_at?: string;
  email_confirmed_at?: string | null;
  user_metadata?: Record<string, any>;
}

interface SupabaseAuthSession {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  expires_at?: number;
}

function getSupabaseAuthClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase public credentials');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });
}

function normalizeText(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null;
  }

  const trimmed = value.trim();
  return trimmed || null;
}

function mapSession(session: SupabaseAuthSession | null | undefined) {
  if (!session) {
    return null;
  }

  return {
    accessToken: session.access_token,
    refreshToken: session.refresh_token,
    tokenType: session.token_type,
    expiresIn: session.expires_in,
    expiresAt: session.expires_at,
  };
}

function mapUser(user: SupabaseAuthUser, fullNameOverride?: string | null) {
  return {
    id: user.id,
    email: user.email ?? null,
    fullName: fullNameOverride ?? normalizeText(user.user_metadata?.full_name) ?? null,
    emailConfirmed: Boolean(user.email_confirmed_at),
    createdAt: user.created_at ?? new Date().toISOString(),
  };
}

export async function loginClientWithSupabase(params: { email: string; password: string }) {
  const supabaseAuth = getSupabaseAuthClient();
  const { data, error } = await supabaseAuth.auth.signInWithPassword({
    email: params.email,
    password: params.password,
  });

  if (error) {
    throw new Error('Email o contrasena incorrectos');
  }

  if (!data.user || !data.session) {
    throw new Error('No se pudo establecer sesion de cliente');
  }

  const orchestration = await bootstrapAuthenticatedClient({
    user: {
      id: data.user.id,
      email: data.user.email ?? params.email,
      fullName: normalizeText(data.user.user_metadata?.full_name),
    },
    input: {
      phone: normalizeText(data.user.user_metadata?.phone),
    },
  });

  return {
    user: mapUser(data.user as SupabaseAuthUser),
    session: mapSession(data.session as SupabaseAuthSession),
    orchestration: orchestration.data.orchestration,
  };
}

export async function registerClientWithSupabase(params: {
  email: string;
  password: string;
  fullName: string;
  phone: string;
  address?: ClientBootstrapAddressInput | null;
}) {
  const supabaseAuth = getSupabaseAuthClient();
  const { data, error } = await supabaseAuth.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName,
        phone: params.phone,
      },
    },
  });

  if (error) {
    if (error.message.includes('already registered')) {
      const { data: existingLoginData, error: existingLoginError } = await supabaseAuth.auth.signInWithPassword({
        email: params.email,
        password: params.password,
      });

      if (existingLoginError || !existingLoginData?.user || !existingLoginData?.session) {
        throw new Error('Este email ya existe. Inicia sesion con tu contrasena actual o restablecela para usar la misma cuenta en cliente y restaurante.');
      }

      const orchestration = await bootstrapAuthenticatedClient({
        user: {
          id: existingLoginData.user.id,
          email: existingLoginData.user.email ?? params.email,
          fullName: params.fullName || normalizeText(existingLoginData.user.user_metadata?.full_name),
        },
        input: {
          phone: params.phone || normalizeText(existingLoginData.user.user_metadata?.phone),
          address: params.address,
        },
      });

      return {
        user: {
          id: existingLoginData.user.id,
          email: existingLoginData.user.email ?? params.email,
          fullName: params.fullName || normalizeText(existingLoginData.user.user_metadata?.full_name),
          createdAt: existingLoginData.user.created_at ?? new Date().toISOString(),
        },
        session: mapSession(existingLoginData.session as SupabaseAuthSession),
        orchestration: orchestration.data.orchestration,
        message: 'Cuenta existente detectada. Se habilito tambien como cliente.',
      };
    }

    throw new Error(`Error en registro de cliente: ${error.message}`);
  }

  if (!data.user) {
    throw new Error('No se pudo crear el usuario cliente');
  }

  const orchestration = await bootstrapAuthenticatedClient({
    user: {
      id: data.user.id,
      email: data.user.email ?? params.email,
      fullName: params.fullName,
    },
    input: {
      phone: params.phone,
      address: params.address,
    },
  });

  return {
    user: {
      id: data.user.id,
      email: data.user.email ?? params.email,
      fullName: params.fullName || normalizeText(data.user.user_metadata?.full_name),
      createdAt: data.user.created_at ?? new Date().toISOString(),
    },
    session: mapSession((data.session as SupabaseAuthSession | null | undefined) ?? null),
    orchestration: orchestration.data.orchestration,
    message: data.session
      ? 'Cliente registrado exitosamente'
      : 'Cliente registrado. Verifica tu email para completar el acceso.',
  };
}