import type { RecommendationScoreCalculator } from '@/modules/recommendations/scoring/recommendation-scoring.engine.js';
import {
  clampScore,
  listOverlapRatio,
  textOverlapRatio,
  tokenize,
} from '@/modules/recommendations/utils/recommendation-matching.js';

const reason = (
  component: RecommendationScoreCalculator['component'],
  message: string,
  evidence: string[] = [],
) => [{ component, message, evidence }];

const requiredSkillsCalculator: RecommendationScoreCalculator = {
  component: 'requiredSkills',
  async calculate(context, job) {
    const { ratio, matched, missing } = listOverlapRatio(context.requiredSkills, job.skills);
    return {
      score: clampScore(ratio),
      matchedSkills: matched,
      missingSkills: missing,
      reasons: reason(
        'requiredSkills',
        matched.length > 0
          ? `Matched ${matched.length} of ${context.requiredSkills.length || matched.length} required skills`
          : context.requiredSkills.length === 0
            ? 'No required skills were specified'
            : 'No required skills matched the job',
        matched,
      ),
    };
  },
};

const preferredSkillsCalculator: RecommendationScoreCalculator = {
  component: 'preferredSkills',
  async calculate(context, job) {
    const { ratio, matched } = listOverlapRatio(context.preferredSkills, job.skills);
    return {
      score: clampScore(ratio),
      relatedSkills: matched,
      reasons: reason(
        'preferredSkills',
        matched.length > 0
          ? `Matched ${matched.length} preferred skills`
          : 'No preferred-skill overlap',
        matched,
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
          : 0.5,
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
        score: 0.5,
        reasons: reason('experience', 'No experience preference provided'),
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
        score: 0.5,
        reasons: reason('responsibilities', 'No source text available for responsibility matching'),
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
      return { score: 1, reasons: reason('location', 'No location preference provided') };
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
      return { score: 1, reasons: reason('industry', 'No industry preference provided') };
    }
    // JobListDto does not expose industry; use company name as a weak signal only.
    const company = job.company.name.toLowerCase();
    const { ratio, matched } = listOverlapRatio(context.industries, [job.company.name]);
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
      return { score: 1, reasons: reason('salary', 'No salary expectation provided') };
    }
    if (job.salary.minimum === null && job.salary.maximum === null) {
      return { score: 0.5, reasons: reason('salary', 'Job salary is undisclosed') };
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
        score: 1,
        reasons: reason('qualifications', 'No qualification preferences provided'),
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
