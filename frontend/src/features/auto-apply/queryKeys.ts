export const autoApplyQueryKeys = {
  profile: ['auto-apply', 'profile'] as const,
  answers: ['auto-apply', 'answers'] as const,
  resumeVersions: ['auto-apply', 'resume-versions'] as const,
  rule: ['auto-apply', 'rule'] as const,
  consents: ['auto-apply', 'consents'] as const,
  submissions: ['auto-apply', 'submissions'] as const,
  setupStatus: ['auto-apply', 'setup-status'] as const,
  privacyAcknowledgement: ['auto-apply', 'privacy-acknowledgement'] as const,
  workspace: (jobApplicationId: string) =>
    ['auto-apply', 'workspace', jobApplicationId] as const,
  plan: (jobId: string) => ['auto-apply', 'plan', jobId] as const,
  events: (jobApplicationId?: string) =>
    ['auto-apply', 'events', jobApplicationId ?? 'all'] as const,
  analysis: (jobId: string) => ['auto-apply', 'analysis', jobId] as const,
  readiness: (jobId: string, stage: string) =>
    ['auto-apply', 'readiness', jobId, stage] as const,
  resumeAnalysis: (jobApplicationId: string) =>
    ['auto-apply', 'resume-analysis', jobApplicationId] as const,
};
