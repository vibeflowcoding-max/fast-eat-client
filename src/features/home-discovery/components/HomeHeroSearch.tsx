import React from 'react';
import { MapPin, Search } from 'lucide-react';
import { HOME_VISUAL_TOKENS } from './homeVisualTokens';
import VoiceSearchButton from './VoiceSearchButton';
import { useTranslations } from 'next-intl';

export interface HomeSearchSuggestionItem {
    id: string;
    label: string;
    kind: 'restaurant' | 'category';
}

export interface HomeSearchRecoveryAction {
    id: string;
    label: string;
}

export interface HomeSearchRecoveryRestaurant {
    id: string;
    label: string;
}

interface HomeHeroSearchProps {
    hasActiveLocation: boolean;
    searchQuery: string;
    onSearchQueryChange: (value: string) => void;
    suggestions?: HomeSearchSuggestionItem[];
    suggestionsLoading?: boolean;
    showSuggestions?: boolean;
    onSuggestionSelect?: (suggestion: HomeSearchSuggestionItem) => void;
    showRecovery?: boolean;
    recoveryAlternatives?: HomeSearchRecoveryRestaurant[];
    recoveryCategories?: HomeSearchRecoveryAction[];
    onRecoveryAlternativeSelect?: (alternativeId: string) => void;
    onRecoveryCategorySelect?: (categoryLabel: string) => void;
    onClearSearch?: () => void;
    profilePrompt?: React.ReactNode;
    loyaltyWidget?: React.ReactNode;
    visualHierarchyV2?: boolean;
}

export default function HomeHeroSearch({
    hasActiveLocation,
    searchQuery,
    onSearchQueryChange,
    suggestions = [],
    suggestionsLoading = false,
    showSuggestions = false,
    onSuggestionSelect,
    showRecovery = false,
    recoveryAlternatives = [],
    recoveryCategories = [],
    onRecoveryAlternativeSelect,
    onRecoveryCategorySelect,
    onClearSearch,
    profilePrompt,
    loyaltyWidget,
    visualHierarchyV2 = false
}: HomeHeroSearchProps) {
    const searchInputId = 'home-search-input';
    const t = useTranslations('home.heroSearch');

    return (
        <div className={visualHierarchyV2 ? HOME_VISUAL_TOKENS.heroContainer : 'px-4 py-4'}>
            <div className={visualHierarchyV2 ? HOME_VISUAL_TOKENS.heroHeader : `mb-4 flex items-center ${loyaltyWidget ? 'justify-between' : 'justify-end'}`}>
                {loyaltyWidget}
                {hasActiveLocation && (
                    <div
                        className={visualHierarchyV2
                            ? HOME_VISUAL_TOKENS.locationChipStyle
                            : 'flex items-center gap-1 rounded-full bg-green-50 px-2 py-1 text-xs text-green-600'}
                    >
                        <MapPin size={12} />
                        <span>{t('activeLocation')}</span>
                    </div>
                )}
            </div>

            {profilePrompt}

            <div className="relative">
                <label htmlFor={searchInputId} className="sr-only">{t('searchLabel')}</label>
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" size={20} />
                <input
                    id={searchInputId}
                    type="text"
                    value={searchQuery}
                    onChange={(event) => onSearchQueryChange(event.target.value)}
                    placeholder={t('searchPlaceholder')}
                    className={visualHierarchyV2
                        ? HOME_VISUAL_TOKENS.searchInputStyle + ' pr-14'
                        : 'w-full rounded-xl bg-gray-100 py-3 pl-10 pr-14 outline-none transition-all focus:bg-white focus:ring-2 focus:ring-orange-500'}
                />
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10">
                    <VoiceSearchButton />
                </div>

                {showSuggestions && (
                    <div className="ui-panel absolute z-50 mt-2 w-full rounded-2xl p-2 shadow-[0_22px_48px_-28px_rgba(98,60,29,0.35)]">
                        {suggestionsLoading && (
                            <p className="px-2 py-1.5 text-sm text-[var(--color-text-muted)]">{t('searchingSuggestions')}</p>
                        )}

                        {!suggestionsLoading && suggestions.length === 0 && (
                            <p className="px-2 py-1.5 text-sm text-[var(--color-text-muted)]">{t('noSuggestions')}</p>
                        )}

                        {!suggestionsLoading && suggestions.length > 0 && (
                            <ul className="flex flex-col gap-1" aria-label={t('suggestionsAria')}>
                                {suggestions.map((suggestion) => (
                                    <li key={suggestion.id}>
                                        <button
                                            type="button"
                                            onClick={() => onSuggestionSelect?.(suggestion)}
                                            className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface-muted)]"
                                        >
                                            <span>{suggestion.label}</span>
                                            <span className="text-xs text-[var(--color-text-muted)]">
                                                {suggestion.kind === 'restaurant' ? t('suggestionKind.restaurant') : t('suggestionKind.category')}
                                            </span>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}
            </div>

            {showRecovery && (
                <div className="ui-panel mt-3 rounded-2xl p-4">
                    <p className="text-sm font-bold text-[var(--color-text)]">{t('noResults')}</p>

                    {recoveryAlternatives.length > 0 && (
                        <div className="mt-2">
                            <p className="text-xs text-[var(--color-text-muted)]">{t('nearbyRestaurants')}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {recoveryAlternatives.map((alternative) => (
                                    <button
                                        key={alternative.id}
                                        type="button"
                                        onClick={() => onRecoveryAlternativeSelect?.(alternative.id)}
                                        className="ui-btn-secondary rounded-full px-3 py-1 text-xs font-semibold"
                                    >
                                        {alternative.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {recoveryCategories.length > 0 && (
                        <div className="mt-3">
                            <p className="text-xs text-[var(--color-text-muted)]">{t('popularCategories')}</p>
                            <div className="mt-1 flex flex-wrap gap-2">
                                {recoveryCategories.map((category) => (
                                    <button
                                        key={category.id}
                                        type="button"
                                        onClick={() => onRecoveryCategorySelect?.(category.label)}
                                        className="ui-chip-brand rounded-full px-3 py-1 text-xs font-semibold"
                                    >
                                        {category.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        onClick={onClearSearch}
                        className="mt-3 text-sm font-bold text-[var(--color-brand)]"
                    >
                        {t('clearSearch')}
                    </button>
                </div>
            )}
        </div>
    );
}
