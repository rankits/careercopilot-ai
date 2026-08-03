import type { RecommendationScoreCalculator } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import {
  clampScore,
  textOverlapRatio,
  tokenize,
} from '@/modules/recommendations/utils/recommendation-matching.js';
import { defaultSkillRelationshipService } from '@/modules/recommendations/skills/skill-relationship.service.js';
import type { SkillRelationshipHit } from '@/modules/recommendations/skills/skill-relationship.service.js';

const reason = (
  component: RecommendationScoreCalculator['component'],
  message: string,
  evidence: string[] = [],
) => [{ component, message, evidence }];

const MISSING_SIGNAL_SCORE = 0.5;

const formatRelationshipEvidence = (
  hits: readonly SkillRelationshipHit[],
  verb: 'covers' | 'supports',
): string[] =>
  hits.map(
    (hit) => `${hit.type.toLowerCase()}: ${hit.availableSkill} ${verb} ${hit.requiredSkill}`,
  );

const formatSkillCoverageMessage = (
  total: number,
  covered: number,
  hits: readonly SkillRelationshipHit[],
  label: 'required' | 'preferred',
): string => {
  const transferableHits = hits.filter((hit) => hit.type === 'TRANSFERABLE');
  if (transferableHits.length === 1 && hits.length === 1 && covered === 1) {
    const [hit] = transferableHits;
    return `Transferable skill ${hit!.availableSkill} can help with ${hit!.requiredSkill}, but it is lower confidence than an exact ${label}-skill match`;
  }
  if (transferableHits.length > 0) {
    return `Covered ${covered} of ${total || covered} ${label} skills, including ${transferableHits.length} lower-confidence transferable skill signal${
      transferableHits.length === 1 ? '' : 's'
    }`;
  }
  return `Covered ${covered} of ${total || covered} ${label} skills with exact, alias, or related skills`;
};

const requiredSkillsCalculator: RecommendationScoreCalculator = {
  component: 'requiredSkills',
  async calculate(context, job) {
    if (context.requiredSkills.length === 0) {
      return {
        score: MISSING_SIGNAL_SCORE,
        matchedSkills: [],
        missingSkills: [],
        reasons: reason('requiredSkills', 'No required skills specified; used neutral score'),
      };
    }
    if (job.skills.length === 0) {
      return {
        score: MISSING_SIGNAL_SCORE,
        matchedSkills: [],
        missingSkills: context.requiredSkills,
        reasons: reason('requiredSkills', 'Job skills unavailable; used neutral score'),
      };
    }
    const { ratio, exact, alias, related, transferable, missing, hits } =
      defaultSkillRelationshipService.overlap(context.requiredSkills, job.skills);
    const evidence = [
      ...exact,
      ...alias.map((skill) => `alias: ${skill}`),
      ...formatRelationshipEvidence(hits, 'covers'),
    ];
    return {
      score: clampScore(ratio),
      matchedSkills: exact,
      aliasSkills: alias,
      relatedSkills: related,
      transferableSkills: transferable,
      missingSkills: missing,
      reasons: reason(
        'requiredSkills',
        evidence.length > 0
          ? formatSkillCoverageMessage(
              context.requiredSkills.length,
              evidence.length,
              hits,
              'required',
            )
          : context.requiredSkills.length === 0
            ? 'No required skills were specified'
            : 'No required skills matched the job',
        evidence,
      ),
    };
  },
};

const preferredSkillsCalculator: RecommendationScoreCalculator = {
  component: 'preferredSkills',
  async calculate(context, job) {
    if (context.preferredSkills.length === 0) {
      return {
        score: MISSING_SIGNAL_SCORE,
        relatedSkills: [],
        reasons: reason('preferredSkills', 'No preferred skills specified; used neutral score'),
      };
    }
    if (job.skills.length === 0) {
      return {
        score: MISSING_SIGNAL_SCORE,
        relatedSkills: [],
        reasons: reason('preferredSkills', 'Job skills unavailable; used neutral score'),
      };
    }
    const { ratio, exact, alias, related, transferable, hits } =
      defaultSkillRelationshipService.overlap(context.preferredSkills, job.skills);
    const evidence = [
      ...exact,
      ...alias.map((skill) => `alias: ${skill}`),
      ...formatRelationshipEvidence(hits, 'supports'),
    ];
    return {
      score: clampScore(ratio),
      aliasSkills: alias,
      relatedSkills: [...exact, ...related],
      transferableSkills: transferable,
      reasons: reason(
        'preferredSkills',
        evidence.length > 0
          ? formatSkillCoverageMessage(
              context.preferredSkills.length,
              evidence.length,
              hits,
              'preferred',
            )
          : 'No preferred-skill overlap',
        evidence,
      ),
    };
  },
};

const titleCalculator: RecommendationScoreCalculator = {
  component: 'title',
  async calculate(context, job) {
    const titles = [...context.targetTitles, ...context.relatedTitles];
    if (titles.length === 0) {
      return {
        score: context.sourceText
          ? clampScore(textOverlapRatio(context.sourceText, job.title))
          : MISSING_SIGNAL_SCORE,
        reasons: reason('title', 'No target titles provided; used neutral/source-text title score'),
      };
    }
    const best = titles.reduce(
      (max, title) => Math.max(max, textOverlapRatio(title, job.title)),
      0,
    );
    return {
      score: clampScore(best),
      reasons: reason('title', `Best title overlap score ${best.toFixed(2)}`, [job.title]),
    };
  },
};

const experienceCalculator: RecommendationScoreCalculator = {
  component: 'experience',
  async calculate(context, job) {
    if (!context.seniority && context.yearsOfExperience === undefined) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason('experience', 'No experience preference provided; used neutral score'),
      };
    }
    const haystack = `${job.title} ${job.skills.join(' ')}`.toLowerCase();
    const seniority = context.seniority?.trim().toLowerCase();
    const seniorTokens = ['senior', 'lead', 'principal', 'staff'];
    const juniorTokens = ['junior', 'entry', 'associate', 'intern'];
    const jobSenior = seniorTokens.some((token) => haystack.includes(token));
    const jobJunior = juniorTokens.some((token) => haystack.includes(token));
    let score = 0.5;
    if (seniority) {
      if (haystack.includes(seniority)) score = 0.85;
      else {
        const wantsSenior = seniorTokens.some((token) => seniority.includes(token));
        const wantsJunior = juniorTokens.some((token) => seniority.includes(token));
        if ((wantsSenior && jobSenior) || (wantsJunior && jobJunior)) score = 0.8;
        else if ((wantsSenior && jobJunior) || (wantsJunior && jobSenior)) score = 0.35;
      }
    }
    if (context.yearsOfExperience !== undefined) {
      // JobListDto has no years field; nudge when title implies seniority.
      if (context.yearsOfExperience >= 5 && jobSenior) score = Math.max(score, 0.75);
      if (context.yearsOfExperience <= 2 && jobJunior) score = Math.max(score, 0.75);
    }
    return {
      score: clampScore(score),
      reasons: reason('experience', 'Heuristic experience/seniority fit from job title signals'),
    };
  },
};

const responsibilitiesCalculator: RecommendationScoreCalculator = {
  component: 'responsibilities',
  async calculate(context, job) {
    if (!context.sourceText?.trim()) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason(
          'responsibilities',
          'No source text available for responsibility matching; used neutral score',
        ),
      };
    }
    const jobText = `${job.title} ${job.skills.join(' ')}`;
    const score = clampScore(textOverlapRatio(context.sourceText, jobText));
    return {
      score,
      reasons: reason(
        'responsibilities',
        'Source-text overlap against job title and skills (list DTOs omit full descriptions)',
      ),
    };
  },
};

const locationCalculator: RecommendationScoreCalculator = {
  component: 'location',
  async calculate(context, job) {
    if (!context.locations.length && !context.remotePreference) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason('location', 'No location preference provided; used neutral score'),
      };
    }
    const jobLocation = `${job.location.formatted} ${job.location.remoteType ?? ''}`.toLowerCase();
    let score = 0;
    if (context.remotePreference) {
      const preference = context.remotePreference.trim().toLowerCase();
      if (
        (job.location.remoteType ?? '').toLowerCase() === preference ||
        jobLocation.includes(preference)
      ) {
        score = Math.max(score, 1);
      }
    }
    for (const location of context.locations) {
      const tokens = tokenize(location);
      if (tokens.length === 0) continue;
      const hits = tokens.filter((token) => jobLocation.includes(token)).length;
      score = Math.max(score, hits / tokens.length);
    }
    return {
      score: clampScore(score),
      reasons: reason('location', 'Location/remote preference overlap', [job.location.formatted]),
    };
  },
};

const industryCalculator: RecommendationScoreCalculator = {
  component: 'industry',
  async calculate(context, job) {
    if (!context.industries.length) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason('industry', 'No industry preference provided; used neutral score'),
      };
    }
    // JobListDto does not expose industry; use company name as a weak signal only.
    const company = job.company.name.toLowerCase();
    const ratio = context.industries.some(
      (industry) => industry.trim().toLowerCase() === job.company.name.trim().toLowerCase(),
    )
      ? 1
      : 0;
    const matched = ratio > 0 ? [job.company.name] : [];
    const tokenHits = context.industries.some((industry) =>
      company.includes(industry.trim().toLowerCase()),
    );
    const score = ratio > 0 ? ratio : tokenHits ? 0.6 : 0.5;
    return {
      score: clampScore(score),
      reasons: reason(
        'industry',
        matched.length > 0 || tokenHits
          ? 'Weak industry signal from company name'
          : 'Job list data has no industry field; used neutral score',
        matched,
      ),
    };
  },
};

const salaryCalculator: RecommendationScoreCalculator = {
  component: 'salary',
  async calculate(context, job) {
    const expectation = context.salaryExpectation;
    if (expectation.minimum === undefined && expectation.maximum === undefined) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason('salary', 'No salary expectation provided; used neutral score'),
      };
    }
    if (job.salary.minimum === null && job.salary.maximum === null) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason('salary', 'Job salary is undisclosed; used neutral score'),
      };
    }
    const jobMin = job.salary.minimum ?? job.salary.maximum ?? 0;
    const jobMax = job.salary.maximum ?? job.salary.minimum ?? 0;
    let score = 0.5;
    if (expectation.minimum !== undefined && jobMax < expectation.minimum) score = 0.2;
    else if (expectation.maximum !== undefined && jobMin > expectation.maximum) score = 0.35;
    else if (
      expectation.minimum !== undefined &&
      expectation.maximum !== undefined &&
      jobMin >= expectation.minimum &&
      jobMax <= expectation.maximum
    ) {
      score = 1;
    } else score = 0.75;
    if (
      expectation.currency &&
      job.salary.currency &&
      expectation.currency.toUpperCase() !== job.salary.currency.toUpperCase()
    ) {
      score *= 0.7;
    }
    return {
      score: clampScore(score),
      reasons: reason('salary', 'Salary band overlap against expectation'),
    };
  },
};

const qualificationsCalculator: RecommendationScoreCalculator = {
  component: 'qualifications',
  async calculate(context, job) {
    const signals = [...context.education, ...context.certifications];
    if (signals.length === 0) {
      return {
        score: MISSING_SIGNAL_SCORE,
        reasons: reason(
          'qualifications',
          'No qualification preferences provided; used neutral score',
        ),
      };
    }
    const haystack = `${job.title} ${job.skills.join(' ')}`.toLowerCase();
    const matched = signals.filter((signal) => {
      const tokens = tokenize(signal);
      return tokens.some((token) => haystack.includes(token));
    });
    const score = matched.length / signals.length;
    return {
      score: clampScore(score > 0 ? Math.max(score, 0.4) : 0.35),
      reasons: reason(
        'qualifications',
        'Qualification token overlap against job title/skills',
        matched,
      ),
    };
  },
};

export const HEURISTIC_SCORE_CALCULATORS: readonly RecommendationScoreCalculator[] = [
  requiredSkillsCalculator,
  preferredSkillsCalculator,
  titleCalculator,
  experienceCalculator,
  responsibilitiesCalculator,
  locationCalculator,
  industryCalculator,
  salaryCalculator,
  qualificationsCalculator,
];
