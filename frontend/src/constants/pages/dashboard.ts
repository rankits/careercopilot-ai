import type { IconTone } from '@/tokens';

export const DASHBOARD_COPY = {
  ctaSubtitle: 'Explore jobs that match your profile.',
  ctaTitle: 'Ready for your next opportunity?',
  emptyRecommended: 'No recommendations yet. Generate matches from AI Match.',
  emptyResumeScore: 'Upload or optimize a resume to see your ATS score.',
  emptySaved: 'No saved jobs yet. Bookmark roles from Job Feed to see them here.',
  exploreJobs: 'Explore Jobs',
  improveResume: 'Improve Resume',
  loadingLabel: 'Loading dashboard',
  pipelineTitle: 'Application Pipeline',
  recommendedTitle: 'Recommended for You',
  resumeChecksTitle: 'Profile readiness',
  resumeScoreTitle: 'Resume Score',
  savedTitle: 'Recently Saved',
  subtitle: "Here's your career overview.",
  viewAllApplications: 'View All Applications',
  viewAllJobs: 'View All Jobs',
  viewAllSaved: 'View All Saved',
  viewJob: 'View Job',
} as const;

export const DASHBOARD_STAT_LABELS = {
  applications: 'Applications',
  jobsMatched: 'Open Jobs',
  matchScore: 'AI Match Score',
  savedJobs: 'Saved Jobs',
} as const;

export const DASHBOARD_PIPELINE_STAGES = [
  { id: 'applied', label: 'Applied', statuses: ['APPLIED'] as const },
  { id: 'reviewed', label: 'Reviewed', statuses: ['SCREENING'] as const },
  { id: 'interview', label: 'Interview', statuses: ['INTERVIEW', 'ASSESSMENT'] as const },
  { id: 'offer', label: 'Offer', statuses: ['OFFER', 'ACCEPTED'] as const },
] as const;

export const DASHBOARD_RESUME_CHECKS = [
  { id: 'skills', label: 'Skills' },
  { id: 'projects', label: 'Projects' },
  { id: 'experience', label: 'Experience' },
  { id: 'ats', label: 'ATS Friendly' },
] as const;

export const DASHBOARD_LIMITS = {
  applicationsFetch: 100,
  penguinMaxHeightPx: 160,
  recommendedJobs: 3,
  recentlySaved: 3,
  sparklinePoints: 7,
  weekMs: 7 * 24 * 60 * 60 * 1000,
} as const;

export type DashboardStatTone = IconTone;
