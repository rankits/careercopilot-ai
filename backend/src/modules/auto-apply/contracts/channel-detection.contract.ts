import { ChannelDetectionResult } from '@/modules/auto-apply/types/channel-detection.types.js';

export interface JobChannelSnapshot {
  id: string;
  status: string;
  /** Highest-priority safe (http/https) apply URL across the job's
   * sources, or null if none — never a raw unvalidated string. */
  applyUrl: string | null;
}

export interface IChannelDetectionJobLookup {
  findJobChannelSnapshot(jobId: string): Promise<JobChannelSnapshot | null>;
}

export interface IChannelDetectionService {
  detectChannel(jobId: string): Promise<ChannelDetectionResult>;
}
