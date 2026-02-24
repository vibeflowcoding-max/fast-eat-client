"use client";

import React from 'react';
import { MapPin, Phone, UserRound, Heart, ClipboardList, Loader2, ShieldAlert } from 'lucide-react';
import BottomNav from '@/components/BottomNav';
import { useAppRouter } from '@/hooks/useAppRouter';
import { useCartStore } from '@/store';

type ProfilePayload = {
  profile: {
    customerId: string;
    fullName: string | null;
    phone: string;
    address: string | null;
    buildingType: string | null;
    unitDetails: string | null;
    deliveryNotes: string | null;
    allergies: string[];
    dietaryPreferences: string[];
    dietaryStrictness: string | null;
  } | null;
  favoriteRestaurants: Array<{ id: string; name: string; logo_url: string | null }>;
};

function initials(fullName: string | null | undefined) {
  if (!fullName) {
    return 'U';
  }

  const parts = fullName.trim().split(/\s+/g);
  return parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || 'U';
}

export default function ProfilePage() {
  const router = useAppRouter();
  const { fromNumber, customerName, customerAddress, dietaryProfile } = useCartStore();

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [payload, setPayload] = React.useState<ProfilePayload | null>(null);

  React.useEffect(() => {
    async function fetchProfile() {
      setLoading(true);
      setError(null);

      try {
        if (!fromNumber) {
          setPayload({ profile: null, favoriteRestaurants: [] });
          return;
        }

        const response = await fetch(`/api/customer/profile?phone=${encodeURIComponent(fromNumber)}`);
        const data = await response.json();

        if (!response.ok) {
          throw new Error(typeof data.error === 'string' ? data.error : 'No se pudo cargar el perfil');
        }

        setPayload(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No se pudo cargar el perfil');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [fromNumber]);

  const profile = payload?.profile;
  const favoriteRestaurants = payload?.favoriteRestaurants ?? [];

  const fullName = profile?.fullName ?? customerName ?? 'Usuario FastEat';
  const phone = profile?.phone ?? fromNumber ?? 'Sin teléfono';
  const address = profile?.address ?? customerAddress?.urlAddress ?? null;
  const allergies = profile?.allergies?.length ? profile.allergies : dietaryProfile?.allergies ?? [];

  return (
    <main className="min-h-screen bg-gray-50 pb-32">
      <div className="mx-auto w-full max-w-3xl px-4 pt-6 space-y-5">
        <header>
          <h1 className="text-2xl font-black text-gray-900">Perfil</h1>
          <p className="text-sm text-gray-500">Tu información, favoritos y preferencias.</p>
        </header>

        {loading && (
          <div className="rounded-2xl border border-gray-200 bg-white p-5 text-sm text-gray-600 flex items-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Cargando perfil...
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700">{error}</div>
        )}

        {!loading && !error && (
          <>
            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-red-500 text-white font-black text-xl flex items-center justify-center">
                  {initials(fullName)}
                </div>
                <div>
                  <h2 className="text-lg font-black text-gray-900">{fullName}</h2>
                  <p className="text-xs text-gray-500">Cliente FastEat</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Teléfono</p>
                  <p className="inline-flex items-center gap-2 text-gray-900"><Phone className="w-4 h-4 text-gray-500" />{phone}</p>
                </div>
                <div className="rounded-xl border border-gray-200 p-3">
                  <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Nombre</p>
                  <p className="inline-flex items-center gap-2 text-gray-900"><UserRound className="w-4 h-4 text-gray-500" />{fullName}</p>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 p-3 text-sm">
                <p className="text-[11px] uppercase tracking-wide text-gray-500 font-bold mb-1">Ubicación</p>
                <p className="inline-flex items-start gap-2 text-gray-900"><MapPin className="w-4 h-4 text-gray-500 mt-0.5" />{address ?? 'No has guardado una dirección todavía'}</p>
              </div>

              <button
                type="button"
                onClick={() => router.push('/orders')}
                className="inline-flex items-center gap-2 rounded-xl bg-gray-900 px-4 py-2 text-sm font-bold text-white hover:bg-black transition-colors"
              >
                <ClipboardList className="w-4 h-4" />
                Ver pedidos
              </button>
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900 inline-flex items-center gap-2">
                <Heart className="w-4 h-4 text-rose-500" />
                Restaurantes favoritos
              </h3>

              {favoriteRestaurants.length === 0 ? (
                <p className="text-sm text-gray-600">Todavía no hay suficientes pedidos para detectar favoritos.</p>
              ) : (
                <div className="space-y-2">
                  {favoriteRestaurants.map((restaurant) => (
                    <article key={restaurant.id} className="rounded-xl border border-gray-200 px-3 py-2 text-sm text-gray-800">
                      {restaurant.name}
                    </article>
                  ))}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-gray-200 bg-white p-5 space-y-3">
              <h3 className="text-sm font-black text-gray-900 inline-flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-600" />
                Configuración de alergias
              </h3>

              {allergies.length === 0 ? (
                <p className="text-sm text-gray-600">No registras alergias por ahora.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {allergies.map((allergy) => (
                    <span key={allergy} className="rounded-full bg-amber-50 border border-amber-200 px-3 py-1 text-xs font-semibold text-amber-700">
                      {allergy}
                    </span>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <BottomNav />
    </main>
  );
}
