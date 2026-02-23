"use client";

import { useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useCartStore } from '@/store';
import LoadingScreen from '@/components/LoadingScreen';

export default function GroupCartJoinPage() {
    const params = useParams();
    const router = useRouter();
    const sessionId = Array.isArray(params.sessionId) ? params.sessionId[0] : params.sessionId;
    const setGroupSession = useCartStore(state => state.setGroupSession);

    useEffect(() => {
        if (sessionId) {
            // Create a random unique ID for the guest
            const guestId = `guest_${Math.random().toString(36).substring(2, 9)}`;

            // Attempt to find user's name if they have one set in the store
            const existingName = useCartStore.getState().customerName || 'Amigo/a';

            // Join the session as a guest (isHost: false)
            setGroupSession(sessionId, false, guestId, existingName);

            // Redirect to home/menu immediately
            router.push('/');
        }
    }, [sessionId, router, setGroupSession]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen">
            <LoadingScreen />
            <p className="mt-4 text-gray-600 font-medium">Uniéndote a la orden grupal...</p>
        </div>
    );
}
