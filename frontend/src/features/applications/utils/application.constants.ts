import { colorTokens, palette } from '@/tokens';

import type {
  ApplicationDisplayConfig,
  ApplicationPriority,
  ApplicationSource,
  ApplicationStatus,
} from '../types/application.view.types';

export const statusDisplayConfig: Record<ApplicationStatus, ApplicationDisplayConfig> = {
  applied: { background: '#dcfce7', color: '#15803d', label: 'APPLIED' },
  assessment: { background: '#ffedd5', color: '#c2410c', label: 'ASSESSMENT' },
  interview: { background: '#dbeafe', color: '#1d4ed8', label: 'INTERVIEW' },
  offer: { background: '#fef9c3', color: '#a16207', label: 'OFFER' },
  preparing: { background: '#ede9fe', color: '#6d28d9', label: 'PREPARING' },
  rejected: { background: '#fee2e2', color: '#b91c1c', label: 'REJECTED' },
  saved: { background: '#f1f5f9', color: '#475569', label: 'SAVED' },
  screening: { background: '#e0f2fe', color: '#0369a1', label: 'SCREENING' },
  withdrawn: { background: '#f3f4f6', color: '#6b7280', label: 'WITHDRAWN' },
};

export const priorityDisplayConfig: Record<ApplicationPriority, ApplicationDisplayConfig> = {
  high: { background: '#fee2e2', color: '#b91c1c', label: 'HIGH' },
  low: { background: '#dcfce7', color: '#15803d', label: 'LOW' },
  medium: { background: '#ffedd5', color: '#c2410c', label: 'MEDIUM' },
};

export const sourceDisplayConfig: Record<ApplicationSource, ApplicationDisplayConfig> = {
  'external-url': { background: '#dcfce7', color: '#15803d', label: 'External URL' },
  'platform-apply': { background: '#ede9fe', color: '#6d28d9', label: 'Platform Apply' },
  'platform-job': { background: '#ede9fe', color: '#6d28d9', label: 'Platform Job' },
};

export const archiveDisplayConfig = {
  active: { background: '#dcfce7', color: '#15803d', label: 'Active' },
  archived: { background: '#f3f4f6', color: '#6b7280', label: 'Archived' },
} as const;

export const statusTabDotColors: Record<string, string> = {
  all: colorTokens.actionPrimary,
  applied: colorTokens.feedbackSuccess,
  assessment: palette.orange500,
  interview: palette.blue600,
  offer: palette.orange500,
  preparing: palette.blue500,
  rejected: colorTokens.feedbackError,
  saved: colorTokens.textSecondary,
  screening: palette.blue600,
  withdrawn: palette.gray400,
};
