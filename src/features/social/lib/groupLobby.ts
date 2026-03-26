import type { GroupCartParticipant } from '@/types';

export type GroupLobbyParticipantState = 'ready' | 'browsing';

export interface GroupLobbySummary {
  participantCount: number;
  readyCount: number;
  totalItems: number;
  totalAmount: number;
}

export function getGroupLobbyParticipantStateLabel(
  participant: GroupCartParticipant,
): GroupLobbyParticipantState {
  // ⚡ Bolt: Use .some() to return 'ready' early instead of summing all items
  const hasItems = participant.items.some((item) => item.quantity > 0);

  return hasItems ? 'ready' : 'browsing';
}

export function buildGroupLobbySummary(
  participants: GroupCartParticipant[],
): GroupLobbySummary {
  const summary: GroupLobbySummary = {
    participantCount: 0,
    readyCount: 0,
    totalItems: 0,
    totalAmount: 0,
  };

  // ⚡ Bolt: Replaced multiple .reduce() iterations with a single-pass loop
  for (const participant of participants) {
    let participantItems = 0;
    let participantAmount = 0;

    for (const item of participant.items) {
      participantItems += item.quantity;
      participantAmount += item.quantity * item.price;
    }

    summary.participantCount += 1;
    summary.totalItems += participantItems;
    summary.totalAmount += participantAmount;

    if (participantItems > 0) {
      summary.readyCount += 1;
    }
  }

  return summary;
}