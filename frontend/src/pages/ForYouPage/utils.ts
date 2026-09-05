export const CAREER_GOAL_MAX_LENGTH = 500;

export const careerCategoryCopy: Record<string, string> = {
  BEST_MATCH: 'Target-role matches',
  GOOD_MATCH: 'Transitional matches',
  STRETCH_OPPORTUNITY: 'Stretch matches',
  RELATED_CAREER_PATH: 'Current and adjacent paths',
};

export const getTabId = (mode: string) => `ai-match-${mode}-tab`;
export const getPanelId = (mode: string) => `ai-match-${mode}-panel`;
