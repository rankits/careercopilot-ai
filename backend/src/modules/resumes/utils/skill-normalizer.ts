const SKILL_ALIASES: Record<string, string> = {
  'amazon web services': 'AWS',
  aws: 'AWS',
  'azure cloud': 'Azure',
  gcp: 'Google Cloud',
  'google cloud platform': 'Google Cloud',
  'google cloud': 'Google Cloud',
  java: 'Java',
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  springboot: 'Spring Boot',
  'spring boot': 'Spring Boot',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  reactjs: 'React',
  'react.js': 'React',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  'docker container': 'Docker',
  'docker containers': 'Docker',
  rest: 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  'ci cd': 'CI/CD',
  cicd: 'CI/CD',
  k8s: 'Kubernetes',
  mongo: 'MongoDB',
  mongodb: 'MongoDB',
  docker: 'Docker',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  react: 'React',
};

const SKILL_BLACKLIST = new Set(
  [
    'ability',
    'achievement',
    'administration',
    'applications',
    'bachelor',
    'build',
    'business',
    'code',
    'client',
    'conduct',
    'contribute',
    'degree',
    'develop',
    'development',
    'engineering',
    'excellent',
    'experience',
    'familiarity',
    'field',
    'good',
    'industry',
    'key',
    'knowledge',
    'management',
    'nice to have',
    'performance',
    'preferred',
    'proficiency',
    'present',
    'required',
    'requirements',
    'responsibilities',
    'responsibility',
    'summary',
    'strong',
    'troubleshoot',
    'work',
    'working',
    'write',
    'years',
    'bde',
    'cloud',
    'component-based',
    'css3',
    'description',
    'educational',
    'es6',
    'google',
    'html5',
    'hybrid',
    'information',
  ].map((item) => item.toLowerCase()),
);

const ACTION_STARTERS =
  /^(?:ability to|able to|build|built|create|created|contribute|develop|developed|drive|driving|excellent|good|manage|managed|required|preferred|responsible|strong|support|supported|troubleshoot|write|working)\b/i;

const SECTION_LABELS =
  /^(?:core competencies|education|experience|job description|key responsibilities|preferred qualifications|required qualifications|requirements|responsibilities|skills|technical skills|tools)$/i;

const ROLE_TITLE_ENDING =
  /\b(?:administrator|analyst|associate|consultant|developer|director|engineer|executive|lead|manager|officer|representative|specialist|trainee)$\b/i;

const KNOWN_TECH_SHAPE =
  /^(?:[A-Z]{2,8}|[A-Za-z]+(?:\.[A-Za-z]+)+|C\+\+|C#|\.NET|CI\/CD|UI\/UX)$/;

const PROFESSIONAL_NOUN_ENDING =
  /\b(?:accounting|acquisition|administration|analysis|analytics|architecture|automation|billing|budgeting|calling|care|coding|compliance|coordination|design|development|documentation|engagement|forecasting|generation|management|marketing|negotiation|operations|payable|payroll|planning|procurement|reconciliation|records|recruitment|reporting|research|sales|sourcing|strategy|support|testing|training)\b/i;

const cleanSkillText = (value: string): string =>
  value
    .replace(/^[-*•●\s]+/, '')
    .replace(/^(?:required|preferred|strong|good|excellent|nice to have)\s+/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[;:,.]+$/g, '')
    .trim();

const toTitleCase = (value: string): string =>
  value.replace(/\b[A-Za-z][A-Za-z/#.+-]*/g, (word) => {
    if (/^(?:API|ATS|AWS|B2B|B2C|BSS|CRM|EHR|GST|HRMS|IFRS|KPI|LTE|OSS|RF|SAP|SEO|SQL|UI\/UX)$/i.test(word)) {
      return word.toUpperCase();
    }
    if (/^(?:iOS|macOS)$/i.test(word)) return word;
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });

const hasBlacklistedWord = (value: string): boolean => {
  const key = value.toLowerCase();
  if (SKILL_BLACKLIST.has(key)) return true;
  return key.includes('.') && key.split('.').some((part) => SKILL_BLACKLIST.has(part));
};

const isSentenceFragment = (value: string): boolean =>
  /[.!?]\s/.test(value) ||
  /\b(?:and|or|to|with|for|in|on|using|used)\b.{12,}/i.test(value) ||
  value.split(/\s+/).length > 5;

const looksLikeProfessionalSkill = (value: string): boolean => {
  if (KNOWN_TECH_SHAPE.test(value)) return true;
  if (/^[A-Z][A-Za-z0-9+#.-]{1,24}$/.test(value)) return true;
  if (/^[A-Za-z][A-Za-z0-9+#.-]{1,24}$/.test(value) && /[A-Z]/.test(value.slice(1))) {
    return true;
  }

  const words = value.split(/\s+/);
  if (words.length < 2 || words.length > 4) return false;
  if (!/^[A-Za-z0-9][A-Za-z0-9+/#.-]*(?:\s[A-Za-z0-9][A-Za-z0-9+/#.-]*){1,3}$/.test(value)) {
    return false;
  }

  return PROFESSIONAL_NOUN_ENDING.test(value) || /\b(?:API|CRM|EHR|ERP|HRMS|SAP|SQL)\b/i.test(value);
};

export const normalizeProfessionalSkill = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = cleanSkillText(value);
  if (!cleaned || cleaned.length > 60) return null;
  if (SECTION_LABELS.test(cleaned)) return null;
  if (ROLE_TITLE_ENDING.test(cleaned)) return null;
  if (hasBlacklistedWord(cleaned)) return null;
  if (ACTION_STARTERS.test(cleaned)) return null;
  if (isSentenceFragment(cleaned)) return null;
  if (cleaned.includes('.') && !/^(?:node|next|vue)\.js$/i.test(cleaned) && !/^\.net$/i.test(cleaned)) {
    return null;
  }

  const aliasKey = cleaned.toLowerCase().replace(/[._-]+/g, ' ').trim();
  const alias = SKILL_ALIASES[aliasKey] ?? SKILL_ALIASES[cleaned.toLowerCase()];
  if (alias) return alias;

  if (!looksLikeProfessionalSkill(cleaned)) return null;
  if (KNOWN_TECH_SHAPE.test(cleaned) || /[A-Z]/.test(cleaned.slice(1))) return cleaned;
  return toTitleCase(cleaned);
};

export const normalizeProfessionalSkills = (values: unknown): string[] => {
  const source = Array.isArray(values) ? values : typeof values === 'string' ? [values] : [];
  const unique = new Map<string, string>();

  for (const value of source) {
    const skill = normalizeProfessionalSkill(value);
    if (skill) unique.set(skill.toLowerCase(), skill);
  }

  return Array.from(unique.values()).sort((a, b) => a.localeCompare(b));
};

export const extractProfessionalSkillsFromText = (text: string): string[] => {
  if (!text?.trim()) return [];

  const candidates = text
    .replace(/[•●]/g, ',')
    .split(/[,|;\n]+/)
    .map((part) =>
      part
        .replace(
          /^(?:required|preferred|skills?|technologies|tools|requirements?|qualifications?|experience with|knowledge of|proficient in)\s*:?\s*/i,
          '',
        )
        .trim(),
    )
    .filter(Boolean);

  const knownShapeMatches =
    text.match(/\b(?:[A-Z]{2,8}|[A-Z][A-Za-z0-9+#.-]{1,24}|[A-Za-z]+(?:\.[A-Za-z]+)+|C\+\+|C#|\.NET|CI\/CD|UI\/UX)\b/g) ??
    [];

  return normalizeProfessionalSkills([...candidates, ...knownShapeMatches]);
};
