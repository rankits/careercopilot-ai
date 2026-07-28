import { NormalizedJob } from "../../models/NormalizedJob.js";
import { ProviderTier } from "../../types/job.types.js";

const TIER_PRIORITY: Record<ProviderTier, number> = {
  [ProviderTier.PAID_AUTH]: 3,
  [ProviderTier.FREE_AUTH]: 2,
  [ProviderTier.PUBLIC]: 1,
};

export interface DeduplicationResult {
  readonly uniqueJobs: NormalizedJob[];
  readonly duplicatesRemoved: number;
}

export class DeduplicationEngine {
  deduplicate(jobs: NormalizedJob[]): DeduplicationResult {
    const hashGroups = new Map<string, NormalizedJob[]>();

    for (const job of jobs) {
      const existing = hashGroups.get(job.canonicalHash) || [];
      existing.push(job);
      hashGroups.set(job.canonicalHash, existing);
    }

    const uniqueJobs: NormalizedJob[] = [];
    let duplicatesRemoved = 0;

    for (const group of hashGroups.values()) {
      if (group.length === 1) {
        uniqueJobs.push(group[0]);
        continue;
      }

      duplicatesRemoved += group.length - 1;

      // Sort group by ProviderTier priority descending, then by postedAt descending
      group.sort((a, b) => {
        const rankA = TIER_PRIORITY[a.providerTier] ?? 0;
        const rankB = TIER_PRIORITY[b.providerTier] ?? 0;
        if (rankA !== rankB) {
          return rankB - rankA;
        }
        return (
          new Date(b.postedAt).getTime() - new Date(a.postedAt).getTime()
        );
      });

      const winner = group[0];
      const allTags = new Set<string>();
      for (const job of group) {
        for (const tag of job.tags) {
          allTags.add(tag);
        }
      }

      const mergedJob: NormalizedJob = {
        ...winner,
        tags: Array.from(allTags),
      };

      uniqueJobs.push(mergedJob);
    }

    return {
      uniqueJobs,
      duplicatesRemoved,
    };
  }
}
