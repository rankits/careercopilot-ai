import {
  AI_MATCH_DEFAULT_CAREER_PATHS,
  AI_MATCH_NON_TECHNICAL_CAREER_PATHS,
  AI_MATCH_TECHNICAL_CAREER_PATHS,
} from '@/constants/pages/aiMatch';

export type CareerProfileTrack = 'technical' | 'non_technical' | 'unknown';

const MAX_QUICK_PICKS = 5;

const TECHNICAL_SIGNAL =
  /\b(software|developer|engineer|programmer|devops|sre|qa engineer|sdet|architect|data scientist|machine learning|ml engineer|full stack|frontend|backend|mobile developer|ios developer|android developer|cloud engineer|platform engineer|infrastructure|cybersecurity|security engineer|network engineer|embedded|firmware|typescript|javascript|python|java|react|node\.?js|golang|ruby on rails|\.net developer|sql developer)\b/i;

const NON_TECHNICAL_SIGNAL =
  /\b(marketing|sales|account executive|business development|hr|human resources|recruiter|talent acquisition|accountant|finance|financial analyst|nurse|teacher|customer success|customer support|help desk|operations manager|office manager|administrative assistant|executive assistant|legal|paralegal|content writer|copywriter|social media|public relations|project manager|product manager|business analyst|consultant|supply chain|procurement|real estate|healthcare assistant|care coordinator|counselor|recruitment)\b/i;

const SENIORITY_PREFIX =
  /\b(junior|jr\.?|associate|assistant|intern|trainee|entry[-\s]level|entry)\b/i;

const LEADERSHIP_SIGNAL =
  /\b(senior|sr\.?|lead|manager|director|head|principal|staff|vp|vice president|chief)\b/i;

export interface CareerProfileSignals {
  designation?: string;
  skills?: string;
  summary?: string;
  workExperience?: string;
}

const CAREER_PROGRESSION_RULES: ReadonlyArray<{
  match: RegExp;
  nextRoles: readonly string[];
}> = [
  {
    match: /\b(frontend|front-end)\s*(developer|engineer)/i,
    nextRoles: ['Full Stack Developer', 'Senior Frontend Engineer', 'UI Engineer'],
  },
  {
    match: /\b(backend|back-end)\s*(developer|engineer)/i,
    nextRoles: ['Senior Backend Engineer', 'Staff Engineer', 'Platform Engineer'],
  },
  {
    match: /\b(full stack|fullstack)\s*(developer|engineer)/i,
    nextRoles: ['Senior Full Stack Engineer', 'Tech Lead', 'Engineering Manager'],
  },
  {
    match: /\bsoftware engineer/i,
    nextRoles: ['Senior Software Engineer', 'Tech Lead', 'Staff Engineer'],
  },
  {
    match: /\b(qa|quality assurance)\s*(engineer|analyst|tester)/i,
    nextRoles: ['Automation Engineer', 'SDET', 'QA Lead'],
  },
  {
    match: /\bdata analyst/i,
    nextRoles: ['Senior Data Analyst', 'Data Scientist', 'Analytics Manager'],
  },
  {
    match: /\bdata scientist/i,
    nextRoles: ['Senior Data Scientist', 'Machine Learning Engineer', 'Data Science Lead'],
  },
  {
    match: /\bproduct manager/i,
    nextRoles: ['Senior Product Manager', 'Group Product Manager', 'Director of Product'],
  },
  {
    match: /\bproject manager/i,
    nextRoles: ['Senior Project Manager', 'Program Manager', 'Delivery Manager'],
  },
  {
    match: /\bmarketing coordinator/i,
    nextRoles: ['Marketing Manager', 'Digital Marketing Specialist', 'Brand Manager'],
  },
  {
    match: /\bmarketing manager/i,
    nextRoles: ['Senior Marketing Manager', 'Marketing Director', 'Head of Marketing'],
  },
  {
    match: /\bsales (representative|executive|associate)/i,
    nextRoles: ['Account Executive', 'Senior Sales Executive', 'Sales Manager'],
  },
  {
    match: /\bhr coordinator/i,
    nextRoles: ['HR Generalist', 'HR Business Partner', 'Talent Acquisition Specialist'],
  },
  {
    match: /\b(customer support|support specialist)/i,
    nextRoles: ['Customer Success Manager', 'Support Team Lead', 'Operations Coordinator'],
  },
  {
    match: /\badministrative assistant/i,
    nextRoles: ['Office Manager', 'Executive Assistant', 'Operations Coordinator'],
  },
  {
    match: /\bbusiness analyst/i,
    nextRoles: ['Senior Business Analyst', 'Product Owner', 'Project Manager'],
  },
  {
    match: /\b(accountant|financial analyst)/i,
    nextRoles: ['Senior Accountant', 'Finance Manager', 'Controller'],
  },
  {
    match: /\b(nurse|registered nurse)/i,
    nextRoles: ['Senior Nurse', 'Charge Nurse', 'Nurse Manager'],
  },
  {
    match: /\b(teacher|instructor)/i,
    nextRoles: ['Senior Teacher', 'Department Head', 'Curriculum Coordinator'],
  },
  {
    match: /\bdesigner/i,
    nextRoles: ['Senior Designer', 'Lead Designer', 'Design Manager'],
  },
  {
    match: /\b(content writer|copywriter)/i,
    nextRoles: ['Senior Content Writer', 'Content Strategist', 'Editorial Lead'],
  },
];

const profileHaystack = ({
  designation,
  skills,
  summary,
  workExperience,
}: CareerProfileSignals): string =>
  [designation, skills, summary, workExperience].filter(Boolean).join(' ').trim();

const ACRONYMS = new Set(['hr', 'it', 'jr', 'qa', 'sdet', 'sr', 'ui', 'ux', 'vp']);

const normalizeWord = (word: string): string => {
  const cleaned = word.replace(/[^\w.-]/g, '');
  if (!cleaned) return word;

  const lower = cleaned.toLowerCase();
  if (ACRONYMS.has(lower)) return lower.toUpperCase();
  if (lower.endsWith('.') && ACRONYMS.has(lower.slice(0, -1))) {
    return `${lower.slice(0, -1).toUpperCase()}.`;
  }

  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1).toLowerCase();
};

const normalizeRole = (value: string): string => {
  const primary = value.split(/[—|–/]/)[0]?.trim() ?? value.trim();
  const withoutCompany = primary.split(' — ')[0]?.trim() ?? primary;
  return withoutCompany.split(/\s+/).map(normalizeWord).join(' ').replace(/\s+/g, ' ').trim();
};

const extractExperienceTitle = (workExperience: string): string | null => {
  const firstLine = workExperience
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);
  if (!firstLine) return null;
  return normalizeRole(firstLine);
};

export const extractCurrentRole = (signals: CareerProfileSignals): string | null => {
  const designation = signals.designation?.trim();
  if (designation) return normalizeRole(designation);

  const experienceTitle = signals.workExperience
    ? extractExperienceTitle(signals.workExperience)
    : null;
  return experienceTitle;
};

const formatCareerPath = (currentRole: string, nextRole: string): string =>
  `${currentRole} → ${nextRole}`;

const stripSeniorityPrefix = (role: string): string =>
  role.replace(SENIORITY_PREFIX, '').replace(/\s+/g, ' ').trim();

const buildGenericProgressions = (currentRole: string): string[] => {
  const paths: string[] = [];
  const baseRole = stripSeniorityPrefix(currentRole) || currentRole;

  if (SENIORITY_PREFIX.test(currentRole) && baseRole !== currentRole) {
    paths.push(formatCareerPath(currentRole, normalizeRole(baseRole)));
  }

  if (!LEADERSHIP_SIGNAL.test(currentRole)) {
    paths.push(formatCareerPath(currentRole, `Senior ${baseRole}`));
    if (!/\b(manager|director|head|lead)\b/i.test(baseRole)) {
      paths.push(formatCareerPath(currentRole, `${baseRole} Manager`));
    }
  }

  return paths;
};

const buildRuleBasedProgressions = (currentRole: string): string[] => {
  const paths: string[] = [];

  for (const rule of CAREER_PROGRESSION_RULES) {
    if (!rule.match.test(currentRole)) continue;
    for (const nextRole of rule.nextRoles) {
      paths.push(formatCareerPath(currentRole, nextRole));
    }
  }

  return paths;
};

const dedupePaths = (paths: readonly string[]): string[] => {
  const seen = new Set<string>();
  const unique: string[] = [];

  for (const path of paths) {
    const normalized = path.trim();
    if (!normalized || seen.has(normalized)) continue;
    seen.add(normalized);
    unique.push(normalized);
  }

  return unique;
};

export function inferCareerProfileTrack(signals: CareerProfileSignals): CareerProfileTrack {
  const haystack = profileHaystack(signals);
  if (!haystack) return 'unknown';

  const technical = TECHNICAL_SIGNAL.test(haystack);
  const nonTechnical = NON_TECHNICAL_SIGNAL.test(haystack);

  if (technical && !nonTechnical) return 'technical';
  if (nonTechnical && !technical) return 'non_technical';

  if (technical && nonTechnical) {
    const role = (signals.designation ?? extractExperienceTitle(signals.workExperience ?? '') ?? '')
      .trim()
      .toLowerCase();
    if (role && TECHNICAL_SIGNAL.test(role)) return 'technical';
    if (role && NON_TECHNICAL_SIGNAL.test(role)) return 'non_technical';
    return 'unknown';
  }

  return 'unknown';
}

export function resolveCareerQuickPicks(track: CareerProfileTrack): readonly string[] {
  switch (track) {
    case 'technical':
      return AI_MATCH_TECHNICAL_CAREER_PATHS;
    case 'non_technical':
      return AI_MATCH_NON_TECHNICAL_CAREER_PATHS;
    default:
      return AI_MATCH_DEFAULT_CAREER_PATHS;
  }
}

export function buildDynamicCareerQuickPicks(signals: CareerProfileSignals): readonly string[] {
  const currentRole = extractCurrentRole(signals);
  const dynamicPaths: string[] = [];

  if (currentRole) {
    dynamicPaths.push(...buildRuleBasedProgressions(currentRole));
    if (dynamicPaths.length < MAX_QUICK_PICKS) {
      dynamicPaths.push(...buildGenericProgressions(currentRole));
    }
  }

  const uniqueDynamic = dedupePaths(dynamicPaths);
  if (uniqueDynamic.length >= 3) {
    return uniqueDynamic.slice(0, MAX_QUICK_PICKS);
  }

  const fallback = resolveCareerQuickPicks(inferCareerProfileTrack(signals));
  return dedupePaths([...uniqueDynamic, ...fallback]).slice(0, MAX_QUICK_PICKS);
}

export function isCareerQuickPick(path: string, quickPicks: readonly string[]): boolean {
  return quickPicks.includes(path);
}
