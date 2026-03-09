import { render, screen, waitFor } from '@testing-library/react';
import RestaurantReviewsSection from './RestaurantReviewsSection';

function createFetchResponse(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  } as unknown as Response;
}

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => {
    if (key === 'reviewCount') {
      return `reviewCount:${values?.count ?? 0}`;
    }
    return key;
  },
}));

describe('RestaurantReviewsSection', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse({ summary: null, reviews: [] })) as unknown as typeof fetch);
  });

  it('renders the empty state when there are no reviews', async () => {
    render(<RestaurantReviewsSection branchId="branch-1" />);

    expect(await screen.findByText('empty')).toBeInTheDocument();
    expect(screen.getAllByText('title').length).toBeGreaterThan(0);
  });

  it('renders summary and review cards when data loads', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse({
      summary: {
        restaurantId: 'restaurant-1',
        restaurantName: 'Sumo Sushi',
        avgRating: 4.7,
        reviewCount: 2,
      },
      reviews: [
        {
          id: 'review-1',
          branchId: 'branch-1',
          branchName: 'Sumo Sushi',
          rating: 5,
          comment: 'Excelente',
          createdAt: '2026-03-08T00:00:00.000Z',
        },
      ],
    })) as unknown as typeof fetch);

    render(<RestaurantReviewsSection branchId="branch-1" limit={10} />);

    expect((await screen.findAllByText('Sumo Sushi')).length).toBeGreaterThan(0);
    expect(screen.getByText('reviewCount:2')).toBeInTheDocument();
    expect(screen.getByText('★ 5.0')).toBeInTheDocument();
    expect(screen.getByText('Excelente')).toBeInTheDocument();
  });

  it('renders the error state when the request fails', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => createFetchResponse({ error: 'loadError' }, false)) as unknown as typeof fetch);

    render(<RestaurantReviewsSection branchId="branch-1" />);

    await waitFor(() => {
      expect(screen.getByText('loadError')).toBeInTheDocument();
    });
  });
});