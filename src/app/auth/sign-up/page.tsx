"use client";

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FormEvent, useState } from 'react';
import { supabase } from '@/lib/supabase';

const COSTA_RICA_PHONE_PREFIX = '+506';
const COSTA_RICA_PHONE_REGEX = /^\+506\d{8}$/;

function normalizeCostaRicaLocalPhoneInput(rawValue: string): string {
  return rawValue.replace(/\D/g, '').slice(0, 8);
}

export default function SignUpPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [localPhone, setLocalPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    const phone = `${COSTA_RICA_PHONE_PREFIX}${localPhone}`;

    if (!COSTA_RICA_PHONE_REGEX.test(phone)) {
      setLoading(false);
      setError('Ingresa un teléfono de Costa Rica válido: +506 y 8 dígitos.');
      return;
    }

    try {
      const response = await fetch('/api/auth/client/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName,
          phone,
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.message || data?.error || 'No se pudo completar el registro');
      }

      if (data?.session?.accessToken && data?.session?.refreshToken) {
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: data.session.accessToken,
          refresh_token: data.session.refreshToken,
        });

        if (sessionError) {
          throw sessionError;
        }

        router.replace('/');
        return;
      }

      setMessage(data?.message || 'Registro completado. Revisa tu email para confirmar tu cuenta.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo completar el registro');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-semibold tracking-tight">Crear cuenta</h1>
        <p className="mt-1 text-sm text-neutral-600">Regístrate para guardar pedidos, favoritos y preferencias.</p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <label className="block text-sm font-medium" htmlFor="fullName">Nombre completo</label>
          <input
            id="fullName"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <label className="block text-sm font-medium" htmlFor="phone">Teléfono</label>
          <div className="flex w-full rounded-lg border border-neutral-300 text-sm focus-within:ring-2 focus-within:ring-neutral-400">
            <span className="inline-flex items-center border-r border-neutral-300 px-3 text-neutral-700">
              {COSTA_RICA_PHONE_PREFIX}
            </span>
            <input
              id="phone"
              value={localPhone}
              onChange={(event) => setLocalPhone(normalizeCostaRicaLocalPhoneInput(event.target.value))}
              required
              type="tel"
              inputMode="numeric"
              pattern="^\d{8}$"
              maxLength={8}
              placeholder="88887777"
              title="Ingresa 8 dígitos; el prefijo +506 se agrega automáticamente"
              className="w-full rounded-r-lg px-3 py-2 outline-none"
            />
          </div>

          <label className="block text-sm font-medium" htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
          />

          <label className="block text-sm font-medium" htmlFor="password">Contraseña</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            minLength={6}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-neutral-400"
          />

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
          {message ? <p className="text-sm text-emerald-700">{message}</p> : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-black px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {loading ? 'Creando cuenta...' : 'Crear cuenta'}
          </button>
        </form>

        <p className="mt-4 text-sm text-neutral-600">
          ¿Ya tienes cuenta?{' '}
          <Link href="/auth/sign-in" className="font-medium underline">
            Inicia sesión
          </Link>
        </p>
      </section>
    </main>
  );
}
