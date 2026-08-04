export interface ApplicationRuleDto {
  id: string;
  userId: string;
  minMatchScore: number;
  dailyApplicationLimit: number;
  weeklyApplicationLimit: number | null;
  blacklistedCompanySlugs: string[];
  excludedTitleKeywords: string[];
  excludedSources: string[];
  autopilotEnabled: boolean;
  autopilotPausedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export const DEFAULT_APPLICATION_RULE: Omit<
  ApplicationRuleDto,
  'id' | 'userId' | 'createdAt' | 'updatedAt'
> = {
  minMatchScore: 0.85,
  dailyApplicationLimit: 5,
  weeklyApplicationLimit: null,
  blacklistedCompanySlugs: [],
  excludedTitleKeywords: [],
  excludedSources: [],
  autopilotEnabled: false,
  autopilotPausedAt: null,
};
