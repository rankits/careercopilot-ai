import type {
  ApiApplicationStatus,
  ApiNoteType,
  ApiTaskType,
} from '@/features/applications/types/application.types';

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

export const noteTypeDisplayConfig: Record<
  ApiNoteType,
  { accent: string; background: string; color: string; label: string }
> = {
  GENERAL: {
    accent: '#6366f1',
    background: '#eef2ff',
    color: '#4338ca',
    label: 'General',
  },
  INTERVIEW: {
    accent: '#2563eb',
    background: '#dbeafe',
    color: '#1d4ed8',
    label: 'Interview',
  },
  OFFER: {
    accent: '#ca8a04',
    background: '#fef9c3',
    color: '#a16207',
    label: 'Offer',
  },
  PREPARATION: {
    accent: '#7c3aed',
    background: '#ede9fe',
    color: '#6d28d9',
    label: 'Preparation',
  },
  RECRUITER: {
    accent: '#0891b2',
    background: '#cffafe',
    color: '#0e7490',
    label: 'Recruiter',
  },
  REJECTION: {
    accent: '#dc2626',
    background: '#fee2e2',
    color: '#b91c1c',
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
