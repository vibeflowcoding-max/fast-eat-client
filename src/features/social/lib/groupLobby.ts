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
  const totalItems = participant.items.reduce((sum, item) => sum + item.quantity, 0);

  return totalItems > 0 ? 'ready' : 'browsing';
}

export function buildGroupLobbySummary(
  participants: GroupCartParticipant[],
): GroupLobbySummary {
  return participants.reduce<GroupLobbySummary>(
    (summary, participant) => {
      const participantItems = participant.items.reduce((sum, item) => sum + item.quantity, 0);
      const participantAmount = participant.items.reduce(
        (sum, item) => sum + item.quantity * item.price,
        0,
      );

      summary.participantCount += 1;
      summary.totalItems += participantItems;
      summary.totalAmount += participantAmount;

      if (participantItems > 0) {
        summary.readyCount += 1;
      }

      return summary;
    },
    {
      participantCount: 0,
      readyCount: 0,
      totalItems: 0,
      totalAmount: 0,
    },
  );
}