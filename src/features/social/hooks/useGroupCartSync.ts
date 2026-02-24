import { useEffect, useCallback, useRef } from 'react';
import { useCartStore } from '@/store';
import { supabase } from '@/lib/supabase';
import { GroupCartParticipant } from '@/types';

export function useGroupCartSync() {
    const groupSessionId = useCartStore((state) => state.groupSessionId);
    const participantId = useCartStore((state) => state.participantId);
    const participantName = useCartStore((state) => state.participantName);
    const isHost = useCartStore((state) => state.isHost);
    const items = useCartStore((state) => state.items);
    const groupParticipants = useCartStore((state) => state.groupParticipants);

    // We use a ref for the channel to access it without causing re-renders/reconnects
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const broadcastMyState = useCallback(() => {
        if (!participantId || !groupSessionId || !channelRef.current) return;

        channelRef.current.send({
            type: 'broadcast',
            event: 'sync_participant',
            payload: {
                id: participantId,
                name: participantName || (isHost ? 'Anfitrión' : 'Invitado'),
                isHost,
                items,
                joinedAt: Date.now()
            } as GroupCartParticipant
        });
    }, [participantId, participantName, isHost, items, groupSessionId]);

    useEffect(() => {
        if (!groupSessionId || !participantId) return;

        // Connect to a unique channel for this specific session
        const channel = supabase.channel(`group_cart_${groupSessionId}`, {
            config: {
                broadcast: { ack: false },
            },
        });

        channelRef.current = channel;

        channel
            .on('broadcast', { event: 'sync_participant' }, ({ payload }) => {
                const incomingParticipant = payload as GroupCartParticipant;

                // Skip our own broadcasts
                if (incomingParticipant.id === participantId) return;

                // Use the global store directly to get the absolute latest state
                const currentState = useCartStore.getState();
                const existingIndex = currentState.groupParticipants.findIndex((p) => p.id === incomingParticipant.id);
                const newParticipants = [...currentState.groupParticipants];

                if (existingIndex > -1) {
                    newParticipants[existingIndex] = incomingParticipant;
                } else {
                    newParticipants.push(incomingParticipant);
                }

                // Sort participants: Host first, then chronological
                newParticipants.sort((a, b) => {
                    if (a.isHost) return -1;
                    if (b.isHost) return 1;
                    return a.joinedAt - b.joinedAt;
                });

                currentState.updateGroupParticipants(newParticipants);
            })
            .on('broadcast', { event: 'request_sync' }, () => {
                // Someone new joined and wants everyone's state
                broadcastMyState();
            })
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('[useGroupCartSync] Subscribed to session:', groupSessionId);
                    // Broadcast our own state immediately upon subscribing
                    broadcastMyState();

                    // Request everyone else to broadcast their state back to us
                    channel.send({
                        type: 'broadcast',
                        event: 'request_sync',
                        payload: {}
                    });
                }
            });

        return () => {
            supabase.removeChannel(channel);
            channelRef.current = null;
        };
    }, [groupSessionId, participantId]); // Intentionally omitted items to preserve connection

    // Whenever MY cart items change, broadcast the update
    useEffect(() => {
        if (channelRef.current && groupSessionId && participantId) {
            broadcastMyState();
        }
    }, [items, broadcastMyState, groupSessionId, participantId]);

    return {
        groupSessionId,
        groupParticipants
    };
}
