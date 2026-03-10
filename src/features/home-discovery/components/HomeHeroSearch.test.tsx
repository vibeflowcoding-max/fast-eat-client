import { fireEvent, render, screen } from '@testing-library/react';

import HomeHeroSearch, { type HomeSearchSuggestionItem } from './HomeHeroSearch';

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('./VoiceSearchButton', () => ({
  default: () => <button type="button">voice-search</button>,
}));

const suggestion: HomeSearchSuggestionItem = {
  id: 'restaurant-1',
  label: 'Sumo Sushi',
  kind: 'restaurant',
};

describe('HomeHeroSearch', () => {
  it('renders the notification trigger in the header above the profile prompt and search row', () => {
    render(
      <HomeHeroSearch
        hasActiveLocation
        loyaltyWidget={<button type="button">loyalty-widget</button>}
        notificationTrigger={<button type="button">notifications-trigger</button>}
        onSearchQueryChange={() => undefined}
        profilePrompt={<div>profile-prompt</div>}
        searchQuery=""
      />,
    );

    const notificationTrigger = screen.getByRole('button', { name: 'notifications-trigger' });
    const profilePrompt = screen.getByText('profile-prompt');
    const searchInput = screen.getByRole('textbox', { name: 'searchLabel' });

    expect(notificationTrigger).toBeInTheDocument();
    expect(notificationTrigger.compareDocumentPosition(profilePrompt) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(notificationTrigger.compareDocumentPosition(searchInput) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders suggestions and notifies the selected suggestion', () => {
    const onSuggestionSelect = vi.fn();

    render(
      <HomeHeroSearch
        hasActiveLocation
        onSearchQueryChange={() => undefined}
        onSuggestionSelect={onSuggestionSelect}
        searchQuery="su"
        showSuggestions
        suggestions={[suggestion]}
      />,
    );

    expect(screen.getByRole('list', { name: 'suggestionsAria' })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Sumo Sushi/i }));

    expect(onSuggestionSelect).toHaveBeenCalledWith(suggestion);
  });

  it('uses the migrated shared search input token when visual hierarchy is enabled', () => {
    render(
      <HomeHeroSearch
        hasActiveLocation
        onSearchQueryChange={() => undefined}
        searchQuery=""
        visualHierarchyV2
      />,
    );

    const input = screen.getByRole('textbox', { name: 'searchLabel' });

    expect(input.className).toContain('border-slate-200');
    expect(input.className).toContain('focus:ring-orange-200');
  });

  it('renders recovery actions and notifies alternative, category, and clear callbacks', () => {
    const onRecoveryAlternativeSelect = vi.fn();
    const onRecoveryCategorySelect = vi.fn();
    const onClearSearch = vi.fn();

    render(
      <HomeHeroSearch
        hasActiveLocation={false}
        onClearSearch={onClearSearch}
        onRecoveryAlternativeSelect={onRecoveryAlternativeSelect}
        onRecoveryCategorySelect={onRecoveryCategorySelect}
        onSearchQueryChange={() => undefined}
        recoveryAlternatives={[{ id: 'branch-1', label: 'Sushi cerca' }]}
        recoveryCategories={[{ id: 'cat-1', label: 'Ramen' }]}
        searchQuery="xyz"
        showRecovery
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Sushi cerca' }));
    fireEvent.click(screen.getByRole('button', { name: 'Ramen' }));
    fireEvent.click(screen.getByRole('button', { name: 'clearSearch' }));

    expect(onRecoveryAlternativeSelect).toHaveBeenCalledWith('branch-1');
    expect(onRecoveryCategorySelect).toHaveBeenCalledWith('Ramen');
    expect(onClearSearch).toHaveBeenCalled();
  });
});