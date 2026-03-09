import { fireEvent, render, screen } from '@testing-library/react';
import BranchReviewsPage from './page';

const back = vi.fn();

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ branchId: 'branch-1' }),
}));

vi.mock('@/hooks/useAppRouter', () => ({
  useAppRouter: () => ({ back, push: vi.fn(), replace: vi.fn(), forward: vi.fn(), refresh: vi.fn(), prefetch: vi.fn() }),
}));

vi.mock('@/components/BottomNav', () => ({
  default: () => <div>bottom-nav</div>,
}));

vi.mock('@/components/RestaurantReviewsSection', () => ({
  default: ({ branchId, limit }: { branchId: string; limit?: number }) => <div>{`${branchId}-${limit}`}</div>,
}));

describe('BranchReviewsPage', () => {
  beforeEach(() => {
    back.mockReset();
  });

  it('renders the route shell and navigates back', () => {
    render(<BranchReviewsPage />);

    expect(screen.getByText('branch-1-50')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'backToMenu' }));
    expect(back).toHaveBeenCalled();
  });
});