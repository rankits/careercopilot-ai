import type {
  ApiApplicationStatus,
  ApiNoteType,
  ApiTaskType,
} from '@/features/applications/types/application.types';
import { colorTokens } from '@/tokens';

export const applicationDetailStatusOptions = [
  { label: 'Saved', value: 'SAVED' as ApiApplicationStatus },
  { label: 'Preparing', value: 'PREPARING' as ApiApplicationStatus },
  { label: 'Applied', value: 'APPLIED' as ApiApplicationStatus },
  { label: 'Screening', value: 'SCREENING' as ApiApplicationStatus },
  { label: 'Interview', value: 'INTERVIEW' as ApiApplicationStatus },
  { label: 'Assessment', value: 'ASSESSMENT' as ApiApplicationStatus },
  { label: 'Offer', value: 'OFFER' as ApiApplicationStatus },
  { label: 'Accepted', value: 'ACCEPTED' as ApiApplicationStatus },
  { label: 'Hired', value: 'HIRED' as ApiApplicationStatus },
  { label: 'Rejected', value: 'REJECTED' as ApiApplicationStatus },
  { label: 'Withdrawn', value: 'WITHDRAWN' as ApiApplicationStatus },
  { label: 'Ghosted', value: 'GHOSTED' as ApiApplicationStatus },
  { label: 'Expired', value: 'EXPIRED' as ApiApplicationStatus },
];

export const applicationNoteTypeOptions = [
  { label: 'General', value: 'GENERAL' as ApiNoteType },
  { label: 'Interview', value: 'INTERVIEW' as ApiNoteType },
  { label: 'Recruiter', value: 'RECRUITER' as ApiNoteType },
  { label: 'Preparation', value: 'PREPARATION' as ApiNoteType },
  { label: 'Offer', value: 'OFFER' as ApiNoteType },
  { label: 'Rejection', value: 'REJECTION' as ApiNoteType },
];

const noteColors = colorTokens.note;

export const noteTypeDisplayConfig: Record<
  ApiNoteType,
  { accent: string; background: string; color: string; label: string }
> = {
  GENERAL: {
    ...noteColors.general,
    label: 'General',
  },
  INTERVIEW: {
    ...noteColors.interview,
    label: 'Interview',
  },
  OFFER: {
    ...noteColors.offer,
    label: 'Offer',
  },
  PREPARATION: {
    ...noteColors.preparation,
    label: 'Preparation',
  },
  RECRUITER: {
    ...noteColors.recruiter,
    label: 'Recruiter',
  },
  REJECTION: {
    ...noteColors.rejection,
    label: 'Rejection',
  },
};

export const applicationTaskTypeOptions = [
  { label: 'Follow up', value: 'FOLLOW_UP' as ApiTaskType },
  { label: 'Prepare interview', value: 'PREPARE_INTERVIEW' as ApiTaskType },
  { label: 'Complete assessment', value: 'COMPLETE_ASSESSMENT' as ApiTaskType },
  { label: 'Send document', value: 'SEND_DOCUMENT' as ApiTaskType },
  { label: 'Research company', value: 'RESEARCH_COMPANY' as ApiTaskType },
  { label: 'Negotiate offer', value: 'NEGOTIATE_OFFER' as ApiTaskType },
  { label: 'Other', value: 'OTHER' as ApiTaskType },
];

export const applicationDetailTabs = [
  { id: 'overview', label: 'Overview' },
  { id: 'notes', label: 'Notes' },
  { id: 'tasks', label: 'Tasks' },
  { id: 'history', label: 'History' },
] as const;

export type ApplicationDetailTab = (typeof applicationDetailTabs)[number]['id'];
