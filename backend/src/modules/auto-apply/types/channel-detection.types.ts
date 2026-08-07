import { AutoApplyChannelValue } from '@/modules/auto-apply/types/job-application.types.js';

export interface ChannelDetectionResult {
  channel: AutoApplyChannelValue;
  reason: string;
}
