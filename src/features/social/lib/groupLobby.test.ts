import { describe, expect, it } from 'vitest';
import type { GroupCartParticipant } from '@/types';
import { buildGroupLobbySummary, getGroupLobbyParticipantStateLabel } from './groupLobby';

const participants: GroupCartParticipant[] = [
  {
    id: 'host-1',
    name: 'Host',
    isHost: true,
    joinedAt: 1,
    items: [
      { id: 'a', name: 'Burger', description: '', notes: '', price: 3200, quantity: 2, category: 'combo', image: '' },
      { id: 'b', name: 'Drink', description: '', notes: '', price: 1200, quantity: 1, category: 'drink', image: '' },
    ],
  },
  {
    id: 'guest-1',
    name: 'Guest',
    isHost: false,
    joinedAt: 2,
    items: [],
  },
];

describe('groupLobby helpers', () => {
  it('marks participants with items as ready', () => {
    expect(getGroupLobbyParticipantStateLabel(participants[0])).toBe('ready');
    expect(getGroupLobbyParticipantStateLabel(participants[1])).toBe('browsing');
  });

  it('builds summary totals from all participants', () => {
    expect(buildGroupLobbySummary(participants)).toEqual({
      participantCount: 2,
      readyCount: 1,
      totalItems: 3,
      totalAmount: 7600,
    });
  });
});