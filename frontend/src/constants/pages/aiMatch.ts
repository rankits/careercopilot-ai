export type MatchScoreHelpMode =
  'profile' | 'resume' | 'similar' | 'text-career' | 'career' | 'saved';

export const AI_MATCH_MATCH_SCORE_HELP: Record<MatchScoreHelpMode, string> = {
  profile: 'Match % shows how well each job fits your profile.',
  resume: 'Match % shows how well each job fits your resume.',
  similar: 'Match % shows how similar each job is to your source job.',
  'text-career': 'Match % shows how well each job fits your description.',
  career: 'Match % shows how well each job fits your career goal.',
  saved: 'Match % shows how well each job fits your saved search.',
};

export const AI_MATCH_COPY = {
  matchScoreHelpTitle: 'How match % works',
  addResume: 'Add resume',
  allSavedJobs: 'All Saved Jobs',
  browseJobs: 'Browse all jobs',
  browseJobsShort: 'Browse jobs',
  careerBanner:
    "Explore opportunities aligned with your career goals. Specify a target role or transition path and we'll find the best matching jobs for you.",
  careerExperienceHelper: 'Choose your current experience level.',
  careerExperienceLabel: 'Experience level',
  careerEmptyPending:
    'No recommendations yet. Set your career preferences above and click Generate matches.',
  careerGenerate: 'Generate matches',
  careerLocationHelper: 'Filter by country. Leave as “Any country” for worldwide results.',
  careerLocationLabel: 'Country',
  careerWorkModeLabel: 'Work mode',
  careerPathHelper: 'Helps us understand the right opportunities for you.',
  careerPathLabel: 'Career path',
  careerPathPlaceholder: 'e.g. Coordinator → Manager',
  careerPopularTitle: 'Quick picks',
  careerPrivacyNote: 'Your data is private and used only to improve recommendations.',
  careerResultCount: (count: number) => `${count} recommended job${count === 1 ? '' : 's'}`,
  careerSuggestBody: "We'll analyze your profile and suggest the best career paths for you.",
  careerSuggestCta: 'Suggest for me',
  careerSuggestTitle: 'Not sure what to choose?',
  careerTargetHelper: 'Enter a role you aim to achieve or transition to.',
  careerTargetLabel: 'Target role',
  careerTargetPlaceholder: 'e.g. Senior Software Engineer',
  careerViewAllPaths: 'View all paths',
  clear: 'Clear',
  completeProfile: 'Complete profile',
  completeProfileDescription:
    'Complete your profile so we can score jobs against your skills and experience.',
  completeProfileTitle: 'Finish your profile',
  confirmedResume: 'Confirmed resume',
  createSavedSearch: 'Create',
  createSavedSearchAria: 'Create saved search',
  deleteSavedSearch: 'Delete',
  deleteSavedSearchAria: 'Delete saved search',
  embeddingWarning:
    'Job embedding index is still warming up. Results may be limited until indexing completes.',
  emptyAfterGenerateDescription:
    'No matching jobs were found for your current profile. Try updating your skills or generate again later.',
  emptyAfterGenerateTitle: 'No matches yet',
  emptyGenerateDescription:
    'No recommendations yet. Generate a personalized set from your profile when you are ready.',
  emptyGenerateTitle: 'Ready when you are',
  experienceAny: 'Any experience level',
  generate: 'Generate recommendations',
  generateMatches: 'Generate matches',
  jobCount: (count: number) => `${count} job${count === 1 ? '' : 's'}`,
  loading: 'Loading recommendations',
  loadingResume: 'Loading resume source',
  loadingSavedSearches: 'Loading saved searches',
  loadingSimilar: 'Loading similar jobs',
  loadingSimilarSource: 'Finding a job from your saved and applied activity',
  loadErrorTitle: "Couldn't load recommendations",
  loadResumeErrorTitle: "Couldn't load resume",
  loadSimilarErrorTitle: "Couldn't load similar jobs",
  locationAny: 'Any location',
  modeTabsAria: 'Recommendation modes',
  scrollModesLeftAria: 'Scroll recommendation modes left',
  scrollModesRightAria: 'Scroll recommendation modes right',
  scrollSavedSearchesLeftAria: 'Scroll saved searches left',
  scrollSavedSearchesRightAria: 'Scroll saved searches right',
  missingProfileDescription:
    'We could not find a candidate profile for your account. Complete onboarding to continue.',
  missingProfileTitle: 'Set up your profile',
  noMatchesCareerToast: 'No matching jobs found for your career goal.',
  noMatchesProfileToast: 'No matching jobs found for your profile.',
  noMatchesResumeToast: 'No matching jobs found for this resume.',
  noMatchesSavedSearchToast: 'No matching jobs found for this saved search.',
  noMatchesTextToast: 'No matching jobs found for your search.',
  modeComingSoon: 'This mode is being wired into the recommendation engine.',
  newSavedSearch: 'New saved search',
  paginationPrevious: 'Previous',
  paginationNext: 'Next',
  processingQueued: 'Your recommendation run is queued.',
  processingRunning: 'Your recommendation run is processing.',
  readinessWarning:
    'Could not load recommendation readiness. You can still browse saved recommendations below.',
  refresh: 'Refresh',
  refreshMatches: 'Refresh matches',
  refreshStatus: 'Refresh status',
  replaceResume: 'Replace',
  resumeBanner:
    "Generate matches based on your uploaded resume. We'll analyze your resume and find the best matching jobs.",
  resumeEmptyAfterGenerate: 'No matching jobs were found for this resume.',
  resumeEmptyDescription:
    'Upload and confirm a parsed resume before generating resume-based matches.',
  resumeEmptyPending:
    "No recommendations yet. Click 'Generate matches' to find jobs that best match your resume.",
  resumeEmptyTitle: 'Add a confirmed resume',
  resumeMeta: (uploadedOn: string, sizeLabel: string) => `Uploaded on ${uploadedOn} • ${sizeLabel}`,
  resumeSectionTitle: 'Your resume',
  resumeResultCount: (count: number) => `${count} recommendation${count === 1 ? '' : 's'}`,
  retry: 'Retry',
  retryRecommendations: 'Retry recommendations',
  regenerate: 'Generate again',
  rerunSavedSearch: 'Rerun',
  rerunSavedSearchAria: 'Rerun saved search',
  savedBanner: "Jobs you've saved for later. Access your bookmarked opportunities anytime.",
  savedCreateToast: 'Saved search created.',
  savedCreateTitle: 'New saved search',
  savedCreateHint: 'Name it, add an optional query, then create.',
  savedDeleteToast: 'Saved search deleted.',
  savedEmptyAfterGenerate: 'No matching jobs were found for this saved search.',
  savedEmptyBookmarks: 'No saved jobs yet. Bookmark roles from the feed to see them here.',
  savedEmptyTitle: 'No saved searches yet',
  savedEmptyDescription: 'Create a named search to rerun matching recommendations anytime.',
  savedJobsCount: (count: number) => `${count} saved job${count === 1 ? '' : 's'}`,
  savedLoadErrorTitle: "Couldn't load saved searches",
  savedActionErrorTitle: "Couldn't update saved search",
  savedNameLabel: 'Saved search name',
  savedNamePlaceholder: 'e.g. Angular remote',
  savedQueryLabel: 'Search query',
  savedQueryPlaceholder: 'Remote TypeScript platform engineer',
  savedResultCount: (count: number) =>
    `${count} saved-search recommendation${count === 1 ? '' : 's'}`,
  savedSearchesTitle: 'Your saved searches',
  savedSelectLabel: 'Saved search',
  savedNoQuery: 'No query saved',
  savedSortNewest: 'Saved date (newest)',
  savedSortOldest: 'Saved date (oldest)',
  setUpProfile: 'Set up profile',
  similarBanner:
    "Showing jobs similar to those you've applied or saved. Based on your job activity and preferences.",
  similarBrowse: 'Browse jobs',
  similarChangeSource: 'Change source job',
  similarEmpty: 'No similar jobs found for this job.',
  similarEmptyDescription:
    'Save or apply to a job, or open a job detail page to choose a different source job.',
  similarEmptyTitle: 'Pick a source job',
  similarResultCount: (count: number) => `${count} similar job${count === 1 ? '' : 's'}`,
  similarSourceLabel: 'Source job',
  sortByLabel: 'Sort by:',
  staleDescription:
    'Your profile changed since these matches were generated. Refresh to update recommendations.',
  subtitle:
    'Personalized matches from your profile. Generation is explicit — loading this page never starts a new run.',
  textBanner:
    "Describe what you're looking for in natural language. Our AI will understand and find relevant opportunities.",
  textEmptyAfterGenerate: 'No matching jobs were found for this text.',
  textEmptyPending:
    "No recommendations yet. Enter what you're looking for above and click 'Generate matches'.",
  textGenerate: 'Generate matches',
  textLabel: "Describe your ideal job or what you're looking for",
  textPlaceholder:
    'Example: Senior backend developer roles in fintech companies with strong system design skills',
  textResultCount: (count: number) => `${count} recommendation${count === 1 ? '' : 's'}`,
  textTooLong: (max: number) => `Use ${max.toLocaleString()} characters or fewer.`,
  title: 'AI Match',
  viewProfileMatches: 'View profile matches',
  resultCount: (total: number) => `${total} recommendation${total === 1 ? '' : 's'}`,
} as const;

export const AI_MATCH_TECHNICAL_CAREER_PATHS = [
  'Frontend Developer → Full Stack Developer',
  'Software Engineer → Tech Lead',
  'Backend Engineer → Staff Engineer',
  'QA Engineer → Automation Engineer',
  'Data Analyst → Data Scientist',
] as const;

export const AI_MATCH_NON_TECHNICAL_CAREER_PATHS = [
  'Marketing Coordinator → Marketing Manager',
  'Sales Representative → Account Executive',
  'HR Coordinator → HR Business Partner',
  'Customer Support Specialist → Customer Success Manager',
  'Administrative Assistant → Office Manager',
] as const;

export const AI_MATCH_DEFAULT_CAREER_PATHS = [
  'Coordinator → Manager',
  'Analyst → Senior Analyst',
  'Marketing Coordinator → Marketing Manager',
  'Customer Support → Customer Success Manager',
  'Individual Contributor → Team Lead',
] as const;

/** @deprecated Use resolveCareerQuickPicks() for profile-aware quick picks. */
export const AI_MATCH_CAREER_PATHS = AI_MATCH_TECHNICAL_CAREER_PATHS;

export const AI_MATCH_EXPERIENCE_OPTIONS = [
  'Any experience level',
  'Internship / Entry',
  'Junior (0–2 yrs)',
  'Mid-level (2–5 yrs)',
  'Senior (5–8 yrs)',
  'Staff / Principal',
  'Manager / Lead',
] as const;

export const AI_MATCH_WORK_MODE_OPTIONS = ['Any work mode', 'Remote', 'Hybrid', 'On-site'] as const;

/** @deprecated Prefer AI_MATCH_WORK_MODE_OPTIONS + getCountryOptions() instead. */
export const AI_MATCH_LOCATION_OPTIONS = [
  'Any location',
  ...AI_MATCH_WORK_MODE_OPTIONS.slice(1),
  'India',
  'United States',
  'Europe',
] as const;
