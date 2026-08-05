export const autoApplyQueryKeys = {
  profile: ['auto-apply', 'profile'] as const,
  answers: ['auto-apply', 'answers'] as const,
  resumeVersions: ['auto-apply', 'resume-versions'] as const,
  rule: ['auto-apply', 'rule'] as const,
  consents: ['auto-apply', 'consents'] as const,
  submissions: ['auto-apply', 'submissions'] as const,
  setupStatus: ['auto-apply', 'setup-status'] as const,
  privacyAcknowledgement: ['auto-apply', 'privacy-acknowledgement'] as const,
  plan: (jobId: string) => ['auto-apply', 'plan', jobId] as const,
};
