export type RecommendationMode =
  'profile' | 'resume' | 'similar' | 'text-career' | 'career' | 'saved';

export const TARGET_TEXT_MAX_LENGTH = 20_000;
export const CAREER_GOAL_MAX_LENGTH = 20_000;

export const recommendationModes: Array<{
  id: RecommendationMode;
  label: string;
  panelLabel: string;
  available: boolean;
}> = [
  { id: 'profile', label: 'Profile', panelLabel: 'Profile recommendations', available: true },
  { id: 'resume', label: 'Resume', panelLabel: 'Resume recommendations', available: true },
  { id: 'similar', label: 'Similar', panelLabel: 'Similar jobs', available: true },
  { id: 'text-career', label: 'Text', panelLabel: 'Text matches', available: true },
  { id: 'career', label: 'Career', panelLabel: 'Career goal matches', available: true },
  { id: 'saved', label: 'Saved', panelLabel: 'Saved search recommendations', available: true },
];

const recommendationModeIds = new Set(recommendationModes.map((mode) => mode.id));

export const getModeFromSearchParams = (searchParams: URLSearchParams): RecommendationMode => {
  const requestedMode = searchParams.get('mode');

  return requestedMode && recommendationModeIds.has(requestedMode as RecommendationMode)
    ? (requestedMode as RecommendationMode)
    : 'profile';
};

export const getTabId = (mode: RecommendationMode) => `for-you-${mode}-tab`;
export const getPanelId = (mode: RecommendationMode) => `for-you-${mode}-panel`;
