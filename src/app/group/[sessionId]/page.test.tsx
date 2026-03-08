import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import GroupCartJoinPage from './page';

const push = vi.fn();
const leaveGroupSession = vi.fn();
const setGroupSession = vi.fn();
const mockShare = vi.fn();
const mockWriteText = vi.fn();

const mockState = {
  branchId: 'branch-1',
  customerName: 'Ivan',
  groupSessionId: '',
  groupParticipants: [
    {
      id: 'guest_1',
      name: 'Ivan',
      isHost: false,
      joinedAt: '2026-03-08T10:00:00.000Z',
      items: [
        { id: 'item-1', name: 'Poke mixto', quantity: 2, price: 3500 },
      ],
    },
    {
      id: 'host_1',
      name: 'Ana',
      isHost: true,
      joinedAt: '2026-03-08T09:50:00.000Z',
      items: [],
    },
  ],
  isHost: false,
  participantId: 'guest_1',
  participantName: 'Ivan',
  restaurantInfo: { name: 'Sumo Sushi', category: 'Sushi' },
  leaveGroupSession,
  setGroupSession,
};

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (!values) return key;
    return `${key}:${JSON.stringify(values)}`;
  },
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ sessionId: 'abc123' }),
  useRouter: () => ({ push }),
}));

vi.mock('@/components/LoadingScreen', () => ({
  default: () => <div>loading-screen</div>,
}));

vi.mock('@/store', () => ({
  useCartStore: () => mockState,
}));

vi.mock('@/features/social/hooks/useGroupCartSync', () => ({
  useGroupCartSync: vi.fn(),
}));

describe('GroupCartJoinPage', () => {
  beforeEach(() => {
    push.mockReset();
    leaveGroupSession.mockReset();
    setGroupSession.mockReset();
    mockShare.mockReset();
    mockWriteText.mockReset();
    Object.assign(navigator, {
      share: mockShare,
      clipboard: { writeText: mockWriteText },
    });
  });

  it('joins the session and renders participant data', async () => {
    render(<GroupCartJoinPage />);

    await waitFor(() => {
      expect(setGroupSession).toHaveBeenCalledWith('abc123', false, expect.stringMatching(/^guest_/), 'Ivan');
    });

    expect(screen.getByText('Sumo Sushi')).toBeInTheDocument();
    expect(screen.getByText('youLabel')).toBeInTheDocument();
    expect(screen.getByText('hostLabel')).toBeInTheDocument();
    expect(screen.getByText('2x Poke mixto')).toBeInTheDocument();
  });

  it('copies the invite link when share is unavailable', async () => {
    Object.assign(navigator, { share: undefined, clipboard: { writeText: mockWriteText } });
    render(<GroupCartJoinPage />);

    fireEvent.click(screen.getByRole('button', { name: 'shareInvite' }));

    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalledWith(expect.stringContaining('/group/abc123'));
    });
  });

  it('leaves the group and navigates home', () => {
    render(<GroupCartJoinPage />);

    fireEvent.click(screen.getByRole('button', { name: 'leaveGroup' }));

    expect(leaveGroupSession).toHaveBeenCalled();
    expect(push).toHaveBeenCalledWith('/');
  });
});