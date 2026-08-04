/**
 * Dynamic skill/keyword extraction — no giant static allowlists.
 * Pulls tech-looking tokens from skills lines, JD text, or free text.
 */

const MULTI_WORD = [
  'Spring Boot',
  'REST APIs',
  'REST API',
  'CI/CD',
  'Node.js',
  'Next.js',
  'Vue.js',
  'React Native',
  'Tailwind CSS',
  'Material UI',
  'Ruby on Rails',
  'Unit Testing',
];

const ALIASES: Record<string, string> = {
  'ci cd': 'CI/CD',
  'rest api': 'REST APIs',
  'rest apis': 'REST APIs',
  reactjs: 'React',
  'react.js': 'React',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  nextjs: 'Next.js',
  vuejs: 'Vue.js',
  springboot: 'Spring Boot',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  html: 'HTML',
  css: 'CSS',
  sql: 'SQL',
  aws: 'AWS',
  gcp: 'GCP',
  junit: 'JUnit',
  jpa: 'JPA',
  jvm: 'JVM',
};

/** Common tech terms that are often all-lowercase in resumes / JDs. */
const COMMON_TECH = new Set(
  [
    'java',
    'python',
    'kotlin',
    'scala',
    'ruby',
    'php',
    'go',
    'golang',
    'rust',
    'swift',
    'dart',
    'react',
    'angular',
    'vue',
    'svelte',
    'django',
    'flask',
    'fastapi',
    'express',
    'nestjs',
    'spring',
    'hibernate',
    'maven',
    'gradle',
    'docker',
    'kubernetes',
    'jenkins',
    'git',
    'github',
    'gitlab',
    'linux',
    'unix',
    'mysql',
    'redis',
    'kafka',
    'rabbitmq',
    'graphql',
    'redux',
    'zustand',
    'webpack',
    'vite',
    'junit',
    'mockito',
    'selenium',
    'cypress',
    'jest',
    'mocha',
    'pytest',
    'numpy',
    'pandas',
    'tensorflow',
    'pytorch',
    'bootstrap',
    'tailwind',
    'sass',
    'less',
    'jquery',
    'ajax',
    'json',
    'xml',
    'yaml',
    'nginx',
    'apache',
    'tomcat',
    'microservices',
    'agile',
    'scrum',
    'kanban',
    'jira',
    'confluence',
    'figma',
    'postman',
    'swagger',
    'oauth',
    'jwt',
    'rest',
    'soap',
    'grpc',
    'html',
    'css',
    'sql',
    'nosql',
    'mongodb',
    'postgresql',
    'postgres',
    'typescript',
    'javascript',
    'nodejs',
    'nextjs',
    'aws',
    'azure',
    'gcp',
  ].map((item) => item.toLowerCase()),
);

const STOP = new Set(
  'a an and or the to of in on for with as by at from into used using such like etc developed created built implemented collaborated maintained optimized required preferred strong familiarity experience knowledge ability engineering industry key field proficiency write build develop troubleshoot working contribute bachelor degree responsibilities responsibility excellent good applications code achievement administration bde business client cloud component-based conduct description development educational es6 google hybrid information management performance present summary years'.split(
    ' ',
  ),
);

const LABEL_NOISE =
  /^(frontend|backend|tools|others|other|build tools|tech used|technologies|technical skills|skills|api|libraries|frameworks|languages|soft skills|core competencies)[:\s-]*$/i;

const uniq = (items: string[]) =>
  Array.from(new Map(items.map((item) => [item.toLowerCase(), item])).values());

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function titleCaseSkill(token: string): string {
  if (/^[A-Z0-9+#./-]+$/.test(token)) return token;
  if (token.includes('.')) return token;
  return token.charAt(0).toUpperCase() + token.slice(1);
}

function looksLikeTech(token: string, loose = false): boolean {
  if (!token || token.length < 2 || token.length > 40) return false;
  const key = token.toLowerCase();
  if (STOP.has(key)) return false;
  if (/^\d+$/.test(token)) return false;
  if (COMMON_TECH.has(key) || ALIASES[key]) return true;
  if (MULTI_WORD.some((item) => item.toLowerCase() === key)) return true;

  // Tech shapes: AWS, C#, .NET, Node.js, CI/CD. Plain Title Case must be known tech.
  if (
    /^[A-Z]{2,6}$/.test(token) ||
    /^[A-Za-z]{2,}(?:\.[A-Za-z]+)+$/.test(token) ||
    /^(c\+\+|c#|\.net|ci\/cd)$/i.test(token)
  ) {
    return true;
  }

  // Comma-list / user-added chips: allow only known lowercase tech aliases.
  if (loose && (COMMON_TECH.has(key) || Boolean(ALIASES[key]))) {
    return true;
  }

  return false;
}

function canonicalize(token: string, loose = false): string | null {
  const cleaned = token
    .replace(/^[-*•●]+\s*/, '')
    .replace(/[:.,;|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || LABEL_NOISE.test(cleaned)) return null;
  const key = cleaned.toLowerCase();
  if (ALIASES[key]) return ALIASES[key];
  if (STOP.has(key)) return null;
  if (!looksLikeTech(cleaned, loose) && !MULTI_WORD.some((m) => m.toLowerCase() === key)) {
    return null;
  }
  const multi = MULTI_WORD.find((m) => m.toLowerCase() === key);
  if (multi) return multi;
  if (COMMON_TECH.has(key)) return titleCaseSkill(cleaned);
  return cleaned;
}

/** Extract skill chips from comma/pipe skills text (or free text). */
export function splitSkillTokens(raw: string): string[] {
  let text = raw
    .replace(/[●•]/g, ',')
    .replace(/\b(Frontend|Backend|Tools|Others|Build Tools|Tech Used|API Integration)\s*:/gi, ',')
    .replace(/\s+/g, ' ')
    .trim();
  if (!text) return [];

  const found: string[] = [];
  for (const skill of MULTI_WORD) {
    const pattern = new RegExp(`\\b${skill.split(/\s+/).map(escapeRe).join('\\s+')}\\b`, 'ig');
    if (pattern.test(text)) {
      found.push(skill === 'REST API' ? 'REST APIs' : skill);
      text = text.replace(pattern, ' | ');
    }
  }

  // Narrative blobs: only keep multi-word hits already collected
  if (
    text.length > 180 &&
    /\b(developed|created|collaborated|maintained|optimized|participated)\b/i.test(text)
  ) {
    return uniq(found);
  }

  // Comma / pipe lists are trusted skill lines — use loose matching so "java, python" survive.
  const parts = text
    .split(/[,|/;]+|\n+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const listLike = parts.length >= 2 || text.length < 120;

  for (const part of parts) {
    if (LABEL_NOISE.test(part)) continue;
    const whole = canonicalize(part, listLike);
    if (whole) {
      found.push(whole);
      continue;
    }
    if (part.split(/\s+/).length > 4) continue;
    for (const word of part.split(/\s+/)) {
      const canonical = canonicalize(word, listLike);
      if (canonical) found.push(canonical);
    }
  }

  return uniq(found);
}

/**
 * Pull tech keywords dynamically from any text (JD, resume, target role).
 * Prefer comma lists + multi-word tech + Capitalized/acronym tokens.
 */
export function extractKeywordsFromText(text: string): string[] {
  if (!text?.trim()) return [];
  const fromLists = splitSkillTokens(text);
  const extras: string[] = [];

  for (const skill of MULTI_WORD) {
    const pattern = new RegExp(`\\b${escapeRe(skill)}\\b`, 'i');
    if (pattern.test(text)) extras.push(skill);
  }

  // Acronyms / dotted tech: AWS, JVM, JPA, GraphQL, Node.js
  const matches = text.match(/\b(?:[A-Z]{2,6}|[A-Za-z]+(?:\.[A-Za-z]+)+|C\+\+|C#|\.NET)\b/g) ?? [];
  for (const match of matches) {
    const canonical = canonicalize(match, true);
    if (canonical) extras.push(canonical);
  }

  // Lowercase common tech anywhere in JD/resume text
  for (const term of COMMON_TECH) {
    const pattern = new RegExp(`\\b${escapeRe(term)}\\b`, 'i');
    if (pattern.test(text)) {
      const canonical = canonicalize(term, true);
      if (canonical) extras.push(canonical);
    }
  }

  // Title-case single tech words near "skills/requirements/experience with"
  const nearReq =
    text.match(
      /(?:skills?|technologies|experience with|proficient in|knowledge of)[:\s]+([A-Za-z0-9+.#/\s,-]{3,120})/gi,
    ) ?? [];
  for (const chunk of nearReq) {
    extras.push(...splitSkillTokens(chunk.replace(/^[^:]+:\s*/i, '')));
  }

  return uniq([...fromLists, ...extras]);
}

export function isSkillLabelNoise(line: string): boolean {
  return LABEL_NOISE.test(line.trim());
}

export function parseSkillChips(value: string): string[] {
  return splitSkillTokens(value);
}

/** Keep user-entered chips even when they are not in the common-tech set. */
export function mergeSkillLists(...lists: Array<string[] | undefined>): string[] {
  const out = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      const value = raw.trim();
      if (!value || LABEL_NOISE.test(value)) continue;
      const canonical = canonicalize(value, true) ?? value;
      out.set(canonical.toLowerCase(), canonical);
    }
  }
  return Array.from(out.values());
}
