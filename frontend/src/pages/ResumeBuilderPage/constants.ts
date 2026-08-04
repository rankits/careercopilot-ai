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
    internalSteps: [3, 4],
  },
  {
    label: 'Review',
    description: 'Improve resume',
    icon: AutoAwesomeOutlinedIcon,
    internalSteps: [5],
  },
  {
    label: 'Export',
    description: 'Download your resume',
    icon: DownloadIcon,
    internalSteps: [10],
  },
];

export const SUPPORTED_RESUME_TYPES = [
  'Chronological Resume',
  'Functional Resume',
  'Combination Resume',
  'Student Resume',
  'Executive Resume',
  'Cover Letter (Optional)',
];
