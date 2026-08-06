import { Button } from '@/components/atoms/Button';
import type { JobCardData } from '@/components/molecules';

import { mapRecommendationDtoToCard } from '@/features/recommendations/hooks/useRecommendations';

import type {
  RecommendationDto,
  RecommendationFeedbackAction,
} from '@/features/recommendations/types/recommendation.types';
import { Alert, Box, CircularProgress, MenuItem, TextField, Typography } from '@/lib/material';

import { getPanelId, getTabId } from '../../utils';
import { RecommendationJobList } from '../RecommendationJobList';

type FeedbackAction = Extract<
  RecommendationFeedbackAction,
  'DISMISSED' | 'NOT_RELEVANT' | 'MORE_LIKE_THIS' | 'LESS_LIKE_THIS'
>;

type SavedSearch = {
  id: string;
  name: string;
  query?: string | null;
};

type SavedSearchPanelProps = {
  savedSearches: {
    isPending: boolean;
    isError: boolean;
  };
  savedSearchError: string | null;
  savedSearchNotice: string | null;
  setSavedSearchNotice: (value: string | null) => void;
  savedSearchName: string;
  setSavedSearchName: (value: string) => void;
  savedSearchQueryText: string;
  setSavedSearchQueryText: (value: string) => void;
  trimmedSavedSearchName: string;
  trimmedSavedSearchQuery: string;
  createSavedSearch: {
    isPending: boolean;
    mutateAsync: (input: { name: string; query?: string }) => Promise<SavedSearch>;
  };
  setSelectedSavedSearchId: (id: string) => void;
  savedSearchesList: SavedSearch[];
  selectedSavedSearchId: string;
  selectedSavedSearch: SavedSearch | undefined;
  generateSavedSearch: {
    isPending: boolean;
    isError: boolean;
    mutateAsync: (id: string) => Promise<RecommendationDto[]>;
  };
  deleteSavedSearch: {
    isPending: boolean;
    mutateAsync: (id: string) => Promise<unknown>;
  };
  setSavedSearchGeneratedOnce: (value: boolean) => void;
  setSavedSearchRecommendations: (cards: ReturnType<typeof mapRecommendationDtoToCard>[]) => void;
  savedSearchGeneratedOnce: boolean;
  visibleSavedSearchRecommendations: ReturnType<typeof mapRecommendationDtoToCard>[];
  savedIdSet: Set<string>;
  moreLikeThisIds: Record<string, boolean>;
  onApply: (job: JobCardData) => void;
  onSave: (job: JobCardData) => void;
  onOpen: (job: JobCardData) => void;
  onFeedback: (recommendationId: string, action: FeedbackAction) => void;
};

export function SavedSearchPanel({
  savedSearches,
  savedSearchError,
  savedSearchNotice,
  setSavedSearchNotice,
  savedSearchName,
  setSavedSearchName,
  savedSearchQueryText,
  setSavedSearchQueryText,
  trimmedSavedSearchName,
  trimmedSavedSearchQuery,
  createSavedSearch,
  setSelectedSavedSearchId,
  savedSearchesList,
  selectedSavedSearchId,
  selectedSavedSearch,
  generateSavedSearch,
  deleteSavedSearch,
  setSavedSearchGeneratedOnce,
  setSavedSearchRecommendations,
  savedSearchGeneratedOnce,
  visibleSavedSearchRecommendations,
  savedIdSet,
  moreLikeThisIds,
  onApply,
  onSave,
  onOpen,
  onFeedback,
}: SavedSearchPanelProps) {
  return (
    <Box
      aria-labelledby={getTabId('saved')}
      id={getPanelId('saved')}
      role="tabpanel"
      sx={{ display: 'grid', gap: 3 }}
    >
      {savedSearches.isPending ? (
        <Box sx={{ display: 'grid', placeItems: 'center', py: 8 }}>
          <CircularProgress aria-label="Loading saved searches" />
        </Box>
      ) : null}

      {savedSearchError ? (
        <Typography role="alert" sx={{ color: 'error.main' }}>
          {savedSearchError}
        </Typography>
      ) : null}

      {savedSearchNotice ? (
        <Alert onClose={() => setSavedSearchNotice(null)} role="status" severity="success">
          {savedSearchNotice}
        </Alert>
      ) : null}

      <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
        <TextField
          fullWidth
          label="Saved search name"
          onChange={(event) => setSavedSearchName(event.target.value)}
          size="small"
          value={savedSearchName}
        />
        <TextField
          fullWidth
          label="Search query"
          multiline
          minRows={3}
          onChange={(event) => setSavedSearchQueryText(event.target.value)}
          placeholder="Example: Remote TypeScript platform engineer"
          value={savedSearchQueryText}
        />
        <Button
          disabled={!trimmedSavedSearchName || createSavedSearch.isPending}
          isLoading={createSavedSearch.isPending}
          onClick={() => {
            if (!trimmedSavedSearchName) return;
            void createSavedSearch
              .mutateAsync({
                name: trimmedSavedSearchName,
                ...(trimmedSavedSearchQuery ? { query: trimmedSavedSearchQuery } : {}),
              })
              .then((savedSearch) => {
                setSelectedSavedSearchId(savedSearch.id);
                setSavedSearchName('');
                setSavedSearchQueryText('');
                setSavedSearchNotice('Saved search created.');
              })
              .catch(() => undefined);
          }}
          size="small"
        >
          Create saved search
        </Button>
      </Box>

      {!savedSearches.isPending && !savedSearches.isError && savedSearchesList.length === 0 ? (
        <Typography role="status" sx={{ color: 'text.secondary', py: 2 }}>
          No saved searches yet.
        </Typography>
      ) : null}

      {savedSearchesList.length > 0 ? (
        <Box sx={{ display: 'grid', gap: 2, justifyItems: 'start' }}>
          <TextField
            label="Saved search"
            onChange={(event) => setSelectedSavedSearchId(event.target.value)}
            select
            size="small"
            sx={{ maxWidth: 420, width: '100%' }}
            value={selectedSavedSearchId}
          >
            {savedSearchesList.map((savedSearch) => (
              <MenuItem key={savedSearch.id} value={savedSearch.id}>
                {savedSearch.name}
              </MenuItem>
            ))}
          </TextField>

          {selectedSavedSearch?.query ? (
            <Typography sx={{ color: 'text.secondary' }}>{selectedSavedSearch.query}</Typography>
          ) : null}

          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            <Button
              disabled={!selectedSavedSearchId || generateSavedSearch.isPending}
              isLoading={generateSavedSearch.isPending}
              onClick={() => {
                if (!selectedSavedSearchId) return;
                setSavedSearchGeneratedOnce(true);
                void generateSavedSearch
                  .mutateAsync(selectedSavedSearchId)
                  .then((items) =>
                    setSavedSearchRecommendations(items.map(mapRecommendationDtoToCard)),
                  )
                  .catch(() => undefined);
              }}
              size="small"
            >
              Rerun saved search
            </Button>
            <Button
              disabled={!selectedSavedSearchId || deleteSavedSearch.isPending}
              isLoading={deleteSavedSearch.isPending}
              onClick={() => {
                if (!selectedSavedSearchId) return;
                const deletedId = selectedSavedSearchId;
                void deleteSavedSearch
                  .mutateAsync(deletedId)
                  .then(() => {
                    setSelectedSavedSearchId('');
                    setSavedSearchRecommendations([]);
                    setSavedSearchNotice('Saved search deleted.');
                  })
                  .catch(() => undefined);
              }}
              size="small"
              variant="outline"
            >
              Delete saved search
            </Button>
          </Box>
        </Box>
      ) : null}

      {savedSearchGeneratedOnce &&
      !generateSavedSearch.isPending &&
      !generateSavedSearch.isError &&
      visibleSavedSearchRecommendations.length === 0 ? (
        <Typography role="status" sx={{ color: 'text.secondary', py: 4 }}>
          No matching jobs were found for this saved search.
        </Typography>
      ) : null}

      {visibleSavedSearchRecommendations.length > 0 ? (
        <>
          <Typography sx={{ color: 'text.secondary' }}>
            {visibleSavedSearchRecommendations.length} saved-search recommendation
            {visibleSavedSearchRecommendations.length === 1 ? '' : 's'}
          </Typography>
          <RecommendationJobList
            ariaLabel="Saved search recommendations"
            items={visibleSavedSearchRecommendations}
            savedIdSet={savedIdSet}
            moreLikeThisIds={moreLikeThisIds}
            onApply={onApply}
            onSave={onSave}
            onOpen={onOpen}
            onFeedback={onFeedback}
          />
        </>
      ) : null}
    </Box>
  );
}
