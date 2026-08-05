/**
 * Frontend skill extraction — catalog-validated tokens only.
 * Mirrors backend skill-normalizer taxonomy for JD preview / Optimize.
 */

const SHORT_ALLOWED = new Set(
  ['c', 'c++', 'c#', 'r', 'go', 'ai', 'ml', 'ui', 'ux', 'sql', 'aws', 'gcp', 'jvm', 'jpa', 'jwt'].map(
    (item) => item.toLowerCase(),
  ),
);

const SKILL_CATALOG = [
  'Java',
  'JavaScript',
  'TypeScript',
  'Python',
  'Kotlin',
  'Scala',
  'Ruby',
  'PHP',
  'Go',
  'Rust',
  'Swift',
  'Dart',
  'C',
  'C++',
  'C#',
  'R',
  'SQL',
  'HTML5',
  'CSS3',
  'SCSS',
  'Sass',
  'Less',
  'React',
  'React.js',
  'React Native',
  'Angular',
  'Vue',
  'Vue.js',
  'Svelte',
  'Next.js',
  'Nuxt.js',
  'Redux',
  'Redux Toolkit',
  'Zustand',
  'Material UI',
  'Tailwind CSS',
  'Bootstrap',
  'jQuery',
  'Vite',
  'Webpack',
  'Micro Frontend',
  'Module Federation',
  'Node.js',
  'Express',
  'Express.js',
  'NestJS',
  'Django',
  'Flask',
  'FastAPI',
  'Spring',
  'Spring Boot',
  'Hibernate',
  'Maven',
  'Gradle',
  '.NET',
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'Google Cloud',
  'Git',
  'GitHub',
  'GitLab',
  'Bitbucket',
  'Jenkins',
  'CI/CD',
  'Linux',
  'Unix',
  'Jest',
  'React Testing Library',
  'Cypress',
  'Playwright',
  'JUnit',
  'Mockito',
  'Selenium',
  'REST API',
  'GraphQL',
  'gRPC',
  'OAuth',
  'JWT',
  'Swagger',
  'Postman',
  'NumPy',
  'Pandas',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'AI',
  'ML',
  'Jira',
  'Confluence',
  'Figma',
  'Agile',
  'Scrum',
  'Kanban',
  'Microservices',
  'JSON',
  'XML',
  'YAML',
  'NoSQL',
] as const;

const ALIASES: Record<string, string> = {
  'ci cd': 'CI/CD',
  cicd: 'CI/CD',
  'ci/cd': 'CI/CD',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  rest: 'REST API',
  restful: 'REST API',
  reactjs: 'React',
  'react.js': 'React.js',
  react: 'React',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  node: 'Node.js',
  'node.js': 'Node.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  vue: 'Vue.js',
  expressjs: 'Express.js',
  'express.js': 'Express.js',
  express: 'Express.js',
  springboot: 'Spring Boot',
  'spring boot': 'Spring Boot',
  spring: 'Spring',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mongodb: 'MongoDB',
  mongo: 'MongoDB',
  javascript: 'JavaScript',
  js: 'JavaScript',
  typescript: 'TypeScript',
  ts: 'TypeScript',
  html: 'HTML5',
  html5: 'HTML5',
  css: 'CSS3',
  css3: 'CSS3',
  scss: 'SCSS',
  sass: 'Sass',
  sql: 'SQL',
  aws: 'AWS',
  azure: 'Azure',
  gcp: 'GCP',
  'google cloud': 'Google Cloud',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  docker: 'Docker',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  jenkins: 'Jenkins',
  java: 'Java',
  python: 'Python',
  kotlin: 'Kotlin',
  hibernate: 'Hibernate',
  redux: 'Redux',
  'redux toolkit': 'Redux Toolkit',
  'tailwind css': 'Tailwind CSS',
  tailwind: 'Tailwind CSS',
  'material ui': 'Material UI',
  mui: 'Material UI',
  'react testing library': 'React Testing Library',
  jest: 'Jest',
  cypress: 'Cypress',
  playwright: 'Playwright',
  graphql: 'GraphQL',
  vite: 'Vite',
  webpack: 'Webpack',
  'micro frontend': 'Micro Frontend',
  'module federation': 'Module Federation',
  golang: 'Go',
  go: 'Go',
  'c++': 'C++',
  'c#': 'C#',
  ai: 'AI',
  ml: 'ML',
  'machine learning': 'Machine Learning',
  junit: 'JUnit',
  kafka: 'Kafka',
  redis: 'Redis',
  mysql: 'MySQL',
  linux: 'Linux',
};

const BLACKLIST = new Set(
  [
    'api',
    'apis',
    'cd',
    'cs',
    'in',
    'on',
    'to',
    'for',
    'with',
    'and',
    'or',
    'the',
    'a',
    'an',
    'control',
    'design',
    'context',
    'context api',
    'collaboration',
    'automation',
    'babel',
    'restful',
    'missing',
    'recommended',
    'missing / recommended',
    'css deep',
    'deep',
    'ability',
    'experience',
    'familiarity',
    'knowledge',
    'proficiency',
    'skills',
    'technologies',
    'technical skills',
    'tools',
    'others',
    'frontend',
    'backend',
    'frameworks',
    'libraries',
    'languages',
    'summary',
    'development',
    'management',
    'performance',
    'cloud',
    'google',
    'es6',
  ].map((item) => item.toLowerCase()),
);

const LABEL_NOISE =
  /^(frontend|backend|tools|others|other|build tools|tech used|technologies|technical skills|skills|api|libraries|frameworks|languages|soft skills|core competencies|matched|missing|recommended)[:\s/-]*$/i;

const catalogByKey = new Map(SKILL_CATALOG.map((skill) => [skill.toLowerCase(), skill] as const));

const uniq = (items: string[]) =>
  Array.from(new Map(items.map((item) => [item.toLowerCase(), item])).values());

const escapeRe = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const aliasKey = (value: string) =>
  value
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

/** Validate + canonicalize a skill against the catalog. */
export function canonicalizeSkill(token: string): string | null {
  const cleaned = token
    .replace(/^[-*•●]+\s*/, '')
    .replace(/[:.,;|]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!cleaned || LABEL_NOISE.test(cleaned)) return null;

  const key = cleaned.toLowerCase();
  if (BLACKLIST.has(key)) return null;
  if (key.length < 2 && !SHORT_ALLOWED.has(key)) return null;

  const aliased = ALIASES[aliasKey(cleaned)] ?? ALIASES[key];
  if (aliased) return aliased;

  return catalogByKey.get(key) ?? null;
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
  for (const skill of SKILL_CATALOG) {
    if (!skill.includes(' ') && !skill.includes('.') && !skill.includes('/')) continue;
    const pattern = new RegExp(`\\b${skill.split(/\s+/).map(escapeRe).join('\\s+')}\\b`, 'ig');
    if (pattern.test(text)) {
      found.push(skill);
      text = text.replace(pattern, ' | ');
    }
  }

  if (
    text.length > 180 &&
    /\b(developed|created|collaborated|maintained|optimized|participated)\b/i.test(text)
  ) {
    return uniq(found);
  }

  const parts = text
    .split(/[,|/;]+|\n+/)
    .map((part) => part.trim())
    .filter(Boolean);

  for (const part of parts) {
    if (LABEL_NOISE.test(part)) continue;
    const whole = canonicalizeSkill(part);
    if (whole) {
      found.push(whole);
      continue;
    }
    if (part.split(/\s+/).length > 4) continue;
    for (const word of part.split(/\s+/)) {
      const canonical = canonicalizeSkill(word);
      if (canonical) found.push(canonical);
    }
  }

  return uniq(found);
}

/**
 * Pull catalog skills from any text (JD, resume, target role).
 */
export function extractKeywordsFromText(text: string): string[] {
  if (!text?.trim()) return [];
  const fromLists = splitSkillTokens(text);
  const extras: string[] = [];

  for (const skill of SKILL_CATALOG) {
    if (!skill.includes(' ') && !skill.includes('.') && !skill.includes('/')) continue;
    const pattern = new RegExp(`\\b${escapeRe(skill)}\\b`, 'i');
    if (pattern.test(text)) extras.push(skill);
  }

  const matches =
    text.match(/\b(?:C\+\+|C#|\.NET|CI\/CD|Node\.js|Next\.js|Vue\.js|Express\.js|React\.js)\b/gi) ??
    [];
  for (const match of matches) {
    const canonical = canonicalizeSkill(match);
    if (canonical) extras.push(canonical);
  }

  for (const term of Object.keys(ALIASES)) {
    if (term.length < 3) continue;
    const pattern = new RegExp(`\\b${escapeRe(term)}\\b`, 'i');
    if (pattern.test(text)) {
      const canonical = canonicalizeSkill(term);
      if (canonical) extras.push(canonical);
    }
  }

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

/**
 * Merge skill lists. Catalog skills are preferred; unknown user chips are kept
 * only when they are not blacklisted noise (manual chip entry).
 */
export function mergeSkillLists(...lists: Array<string[] | undefined>): string[] {
  const out = new Map<string, string>();
  for (const list of lists) {
    for (const raw of list ?? []) {
      const value = raw.trim();
      if (!value || LABEL_NOISE.test(value)) continue;
      if (BLACKLIST.has(value.toLowerCase())) continue;
      const canonical = canonicalizeSkill(value);
      if (canonical) {
        out.set(canonical.toLowerCase(), canonical);
        continue;
      }
      // Preserve intentional user chips that are not generic noise.
      if (value.length >= 2 && value.length <= 40 && !/\s{2,}/.test(value)) {
        out.set(value.toLowerCase(), value);
      }
    }
  }
  return Array.from(out.values());
}
