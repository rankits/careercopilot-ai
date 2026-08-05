import type { SvgIconComponent } from '@/lib/material';
import {
  AutoAwesomeOutlinedIcon,
  BarChartOutlinedIcon,
  CloudUploadOutlinedIcon,
  DownloadIcon,
  WorkOutlineOutlinedIcon,
} from '@/lib/material';

export type ResumeBuilderStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

export interface WorkflowStep {
  label: string;
  description: string;
  icon: SvgIconComponent;
  internalSteps: ResumeBuilderStep[];
}

export const WORKFLOW_STEPS: WorkflowStep[] = [
  {
    label: 'Upload',
    description: 'Completed',
    icon: CloudUploadOutlinedIcon,
    internalSteps: [1],
  },
  {
    label: 'Define Role',
    description: 'In progress',
    icon: WorkOutlineOutlinedIcon,
    internalSteps: [2],
  },
  {
    label: 'Analyze',
    description: 'Resume analysis',
    icon: BarChartOutlinedIcon,
    internalSteps: [3],
  },
  {
    label: 'Review',
    description: 'Improve resume',
    icon: AutoAwesomeOutlinedIcon,
    internalSteps: [4, 5],
  },
  {
    label: 'Export',
    description: 'Download your resume',
    icon: DownloadIcon,
    internalSteps: [10],
  },
];

/** Rotating copy shown while ATS analysis is in progress. */
export const ANALYSIS_LOADING_MESSAGES = [
  'Parsing your resume...',
  'Extracting resume information...',
  'Reading the Job Description...',
  'Matching your resume with the Job Description...',
  'Comparing technical skills...',
  'Comparing work experience...',
  'Comparing projects and achievements...',
  'Identifying missing skills...',
  'Calculating ATS score...',
  'Generating AI improvement suggestions...',
  'Finalizing your resume analysis...',
] as const;

export const SUPPORTED_RESUME_TYPES = [
  'Chronological Resume',
  'Functional Resume',
  'Combination Resume',
  'Student Resume',
  'Executive Resume',
  'Cover Letter (Optional)',
];
