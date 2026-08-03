import type { JobListDto } from '@/modules/job-listing/types/job-listing.types.js';
import type {
  RecommendationReason,
  ScoredJobRecommendation,
} from '@/modules/recommendations/types/recommendations.types.js';

const MORE_LIKE_THIS_MAX_BOOST = 0.05;
const MORE_LIKE_THIS_BOOST_WEIGHT = 0.04;

const tokenize = (value: string | null | undefined): Set<string> =>
  new Set(
    (value ?? '')
      .toLowerCase()
      .split(/[^a-z0-9+#.]+/u)
      .map((token) => token.trim())
      .filter((token) => token.length >= 2),
  );

const normalizeList = (values: readonly string[] | null | undefined): Set<string> =>
  new Set(
    (values ?? [])
      .map((value) => value.trim().toLowerCase())
      .filter((value) => value.length > 0),
  );

const overlapRatio = (left: Set<string>, right: Set<string>): number => {
  const denominator = Math.min(left.size, right.size);
  if (denominator === 0) return 0;
  let overlap = 0;
  for (const value of left) {
    if (right.has(value)) overlap += 1;
  }
  return overlap / denominator;
};

const companyKey = (job: JobListDto): string =>
  (job.company.slug || job.company.name).trim().toLowerCase();

const jobSimilarity = (candidate: JobListDto, anchor: JobListDto): number => {
  if (candidate.id === anchor.id) return 0;

  const skillSimilarity = overlapRatio(normalizeList(candidate.skills), normalizeList(anchor.skills));
  const titleSimilarity = overlapRatio(tokenize(candidate.title), tokenize(anchor.title));
  const companySimilarity =
    companyKey(candidate) && companyKey(candidate) === companyKey(anchor) ? 1 : 0;

  return Math.min(1, skillSimilarity * 0.7 + titleSimilarity * 0.2 + companySimilarity * 0.1);
};

const affinityReason = (similarity: number, boost: number, anchorJobId: string): RecommendationReason => ({
  component: 'requiredSkills',
  message: 'More-like-this feedback lightly boosted this recommendation',
  evidence: [
    `moreLikeThisAnchorJobId=${anchorJobId}`,
    `moreLikeThisSimilarity=${similarity.toFixed(4)}`,
    `moreLikeThisBoost=${boost.toFixed(4)}`,
  ],
});

export const applyMoreLikeThisAffinityBoost = <T extends ScoredJobRecommendation>(
  recommendations: readonly T[],
  anchorJobs: readonly JobListDto[],
): T[] => {
  if (anchorJobs.length === 0) return [...recommendations];

  return recommendations.map((item) => {
    const best = anchorJobs.reduce(
      (current, anchor) => {
        const similarity = jobSimilarity(item.job, anchor);
        return similarity > current.similarity ? { anchor, similarity } : current;
      },
      { anchor: null as JobListDto | null, similarity: 0 },
    );
    if (!best.anchor || best.similarity <= 0) return item;

    const boost = Math.min(MORE_LIKE_THIS_MAX_BOOST, best.similarity * MORE_LIKE_THIS_BOOST_WEIGHT);
    const overallScore = Math.min(1, item.scoreResult.overallScore + boost);

    return {
      ...item,
      scoreResult: {
        ...item.scoreResult,
        overallScore,
        reasons: [
          ...item.scoreResult.reasons,
          affinityReason(best.similarity, boost, best.anchor.id),
        ],
      },
    };
  });
};

