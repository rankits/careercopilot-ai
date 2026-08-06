/**
 * Resume skill taxonomy — only catalog skills are used for extraction,
 * ATS matching, and AI skill recommendations.
 */

const SHORT_ALLOWED = new Set(
  [
    'c',
    'c++',
    'c#',
    'r',
    'go',
    'ai',
    'ml',
    'ui',
    'ux',
    'sql',
    'aws',
    'gcp',
    'jvm',
    'jpa',
    'jwt',
    's3',
  ].map((item) => item.toLowerCase()),
);

/** Canonical skill catalog (display form). */
export const SKILL_CATALOG: string[] = [
  // Languages
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
  // Frontend
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
  // Backend
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
  'ASP.NET',
  // Data / cloud
  'MongoDB',
  'PostgreSQL',
  'MySQL',
  'Redis',
  'Kafka',
  'RabbitMQ',
  'Elasticsearch',
  'Docker',
  'Kubernetes',
  'AWS',
  'Azure',
  'GCP',
  'Google Cloud',
  'Terraform',
  'Ansible',
  // DevOps / tools
  'Git',
  'GitHub',
  'GitLab',
  'Bitbucket',
  'Jenkins',
  'CI/CD',
  'Linux',
  'Unix',
  'Nginx',
  'Apache',
  'Tomcat',
  // Testing
  'Jest',
  'React Testing Library',
  'Cypress',
  'Playwright',
  'Mocha',
  'Pytest',
  'JUnit',
  'Mockito',
  'Selenium',
  // APIs / protocols
  'REST API',
  'GraphQL',
  'gRPC',
  'SOAP',
  'OAuth',
  'JWT',
  'OpenAPI',
  'Swagger',
  'Postman',
  // Data science / AI
  'NumPy',
  'Pandas',
  'TensorFlow',
  'PyTorch',
  'Machine Learning',
  'AI',
  'ML',
  // Collaboration / process (kept minimal — real tool names only)
  'Jira',
  'Confluence',
  'Figma',
  'Agile',
  'Scrum',
  'Kanban',
  // Misc tech
  'Microservices',
  'JSON',
  'XML',
  'YAML',
  'NoSQL',
  'Firebase',
  'Supabase',
  'Prisma',
  'TypeORM',
  'Sequelize',
];

const SKILL_ALIASES: Record<string, string> = {
  'amazon web services': 'AWS',
  aws: 'AWS',
  'azure cloud': 'Azure',
  azure: 'Azure',
  gcp: 'GCP',
  'google cloud platform': 'Google Cloud',
  'google cloud': 'Google Cloud',
  java: 'Java',
  js: 'JavaScript',
  javascript: 'JavaScript',
  ts: 'TypeScript',
  typescript: 'TypeScript',
  springboot: 'Spring Boot',
  'spring boot': 'Spring Boot',
  spring: 'Spring',
  node: 'Node.js',
  nodejs: 'Node.js',
  'node js': 'Node.js',
  'node.js': 'Node.js',
  react: 'React',
  reactjs: 'React',
  'react.js': 'React',
  'react native': 'React Native',
  vue: 'Vue',
  vuejs: 'Vue',
  'vue.js': 'Vue',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  express: 'Express',
  expressjs: 'Express',
  'express.js': 'Express',
  nestjs: 'NestJS',
  postgres: 'PostgreSQL',
  postgresql: 'PostgreSQL',
  mongo: 'MongoDB',
  mongodb: 'MongoDB',
  mysql: 'MySQL',
  redis: 'Redis',
  docker: 'Docker',
  k8s: 'Kubernetes',
  kubernetes: 'Kubernetes',
  git: 'Git',
  github: 'GitHub',
  gitlab: 'GitLab',
  bitbucket: 'Bitbucket',
  jenkins: 'Jenkins',
  'ci cd': 'CI/CD',
  cicd: 'CI/CD',
  'ci/cd': 'CI/CD',
  rest: 'REST API',
  'rest api': 'REST API',
  'rest apis': 'REST API',
  restful: 'REST API',
  graphql: 'GraphQL',
  html: 'HTML5',
  html5: 'HTML5',
  css: 'CSS3',
  css3: 'CSS3',
  scss: 'SCSS',
  sass: 'Sass',
  'tailwind css': 'Tailwind CSS',
  tailwind: 'Tailwind CSS',
  'material ui': 'Material UI',
  mui: 'Material UI',
  'redux toolkit': 'Redux Toolkit',
  redux: 'Redux',
  vite: 'Vite',
  webpack: 'Webpack',
  jest: 'Jest',
  cypress: 'Cypress',
  playwright: 'Playwright',
  'react testing library': 'React Testing Library',
  rtl: 'React Testing Library',
  'micro frontend': 'Micro Frontend',
  'micro frontends': 'Micro Frontend',
  'module federation': 'Module Federation',
  python: 'Python',
  kotlin: 'Kotlin',
  hibernate: 'Hibernate',
  maven: 'Maven',
  gradle: 'Gradle',
  junit: 'JUnit',
  kafka: 'Kafka',
  linux: 'Linux',
  jwt: 'JWT',
  oauth: 'OAuth',
  swagger: 'Swagger',
  postman: 'Postman',
  figma: 'Figma',
  jira: 'Jira',
  terraform: 'Terraform',
  '.net': '.NET',
  'c++': 'C++',
  'c#': 'C#',
  go: 'Go',
  golang: 'Go',
  ai: 'AI',
  ml: 'ML',
  'machine learning': 'Machine Learning',
};

/** Generic / incomplete / section tokens that must never become skills. */
const SKILL_BLACKLIST = new Set(
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
    'missing/recommended',
    'css deep',
    'deep',
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
    'description',
    'educational',
    'es6',
    'google',
    'hybrid',
    'information',
    'frontend',
    'backend',
    'tools',
    'others',
    'skills',
    'technologies',
    'technical skills',
    'soft skills',
    'core competencies',
    'libraries',
    'frameworks',
    'languages',
  ].map((item) => item.toLowerCase()),
);

const SECTION_LABELS =
  /^(?:core competencies|education|experience|job description|key responsibilities|preferred qualifications|required qualifications|requirements|responsibilities|skills|technical skills|tools|matched|missing|recommended)$/i;

const ROLE_TITLE_ENDING =
  /\b(?:administrator|analyst|associate|consultant|developer|director|engineer|executive|lead|manager|officer|representative|specialist|trainee)$\b/i;

const ACTION_STARTERS =
  /^(?:ability to|able to|build|built|create|created|contribute|develop|developed|drive|driving|excellent|good|manage|managed|required|preferred|responsible|strong|support|supported|troubleshoot|write|working)\b/i;

const catalogByKey = new Map(SKILL_CATALOG.map((skill) => [skill.toLowerCase(), skill] as const));

const aliasKey = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[._-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const cleanSkillText = (value: string): string =>
  value
    .replace(/^[-*•●\s]+/, '')
    .replace(/^(?:required|preferred|strong|good|excellent|nice to have|add)\s+/i, '')
    .replace(/\s+to\s+skills$/i, '')
    .replace(/\s+/g, ' ')
    .replace(/[;:,.]+$/g, '')
    .trim();

export const normalizeProfessionalSkill = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const cleaned = cleanSkillText(value);
  if (!cleaned || cleaned.length > 48) return null;
  if (SECTION_LABELS.test(cleaned)) return null;
  if (ROLE_TITLE_ENDING.test(cleaned)) return null;
  if (ACTION_STARTERS.test(cleaned)) return null;

  const key = cleaned.toLowerCase();
  if (SKILL_BLACKLIST.has(key)) return null;

  // Aliases first so "js" → JavaScript and "react.js" → React before short-token rejects.
  const aliased = SKILL_ALIASES[aliasKey(cleaned)] ?? SKILL_ALIASES[key];
  if (aliased) return aliased;

  if (key.length < 2 && !SHORT_ALLOWED.has(key)) return null;
  if (key.length === 2 && !SHORT_ALLOWED.has(key) && !catalogByKey.has(key)) return null;

  // Collapse catalog duplicates: React.js → React, Node.js stays Node.js via alias above.
  const catalogHit = catalogByKey.get(key);
  if (catalogHit) {
    const catalogAlias =
      SKILL_ALIASES[aliasKey(catalogHit)] ?? SKILL_ALIASES[catalogHit.toLowerCase()];
    return catalogAlias ?? catalogHit;
  }

  // Reject anything not in the taxonomy — no free-form Title Case guessing.
  return null;
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

  // Soften OCR / PDF glue: ReactJS, Node. js, zero-width chars.
  const softened = text
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/\b([A-Za-z]{2,20})\s*\.\s*js\b/gi, '$1.js')
    .replace(/\b(React|Node|Next|Vue|Express)[\s._-]*js\b/gi, '$1.js');

  const candidates = softened
    .replace(/[•●▪◦]/g, ',')
    .split(/[,|;\n/]+/)
    .map((part) =>
      part
        .replace(
          /^(?:required|preferred|skills?|technologies|tools|requirements?|qualifications?|experience with|knowledge of|proficient in)\s*:?\s*/i,
          '',
        )
        // Keep first skill-looking token when OCR glues a sentence after it ("Kafka. Ability…").
        .replace(/^([A-Za-z0-9+#._-]{2,40})[.].*$/, '$1')
        .trim(),
    )
    .filter(Boolean);

  const catalogHits: string[] = [];
  for (const skill of SKILL_CATALOG) {
    // Skip ultra-short ambiguous tokens (C, R, Go handled via careful boundaries below).
    if (skill.length <= 2 && !SHORT_ALLOWED.has(skill.toLowerCase())) continue;
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
    // Allow React ≈ React.js ≈ ReactJS in catalog scans.
    const flexible =
      /\.js$/i.test(skill) || /^(react|node|next|vue|express)$/i.test(skill)
        ? `\\b${escaped.replace(/\\\.js$/i, '')}(?:[\\s._-]*js|\\.js)?\\b`
        : `\\b${escaped}\\b`;
    const pattern = new RegExp(flexible, 'i');
    if (pattern.test(softened)) catalogHits.push(skill);
  }

  const knownShapeMatches =
    softened.match(
      /\b(?:C\+\+|C#|\.NET|CI\/CD|Node\.?js|Next\.?js|Vue\.?js|Express\.?js|React\.?js|ReactJS|NodeJS|NextJS|VueJS|ExpressJS)\b/gi,
    ) ?? [];

  return normalizeProfessionalSkills([...candidates, ...catalogHits, ...knownShapeMatches]);
};

/**
 * Canonical key for overlap checks so React ≈ React.js, Node ≈ Node.js, etc.
 */
export const skillMatchKey = (value: string): string => {
  const normalized = normalizeProfessionalSkill(value) ?? value.trim();
  return normalized.toLowerCase().replace(/\.js$/i, '').replace(/\s+/g, ' ').trim();
};

const compactSkillToken = (value: string): string =>
  value
    .toLowerCase()
    .replace(/\.js$/i, 'js')
    .replace(/[\s._/-]+/g, '');

/** Variant spellings to probe inside resume/JD text. */
export const skillMatchVariants = (value: string): string[] => {
  const normalized = normalizeProfessionalSkill(value) ?? value.trim();
  if (!normalized) return [];
  const variants = new Set<string>([normalized, value.trim()]);
  const key = normalized.toLowerCase();
  const base = key.replace(/\.js$/i, '').trim();
  if (base) {
    variants.add(base);
    variants.add(`${base}.js`);
    variants.add(`${base}js`);
    variants.add(`${base} js`);
    // Title-case base (react → React)
    variants.add(base.replace(/\b[a-z]/g, (ch) => ch.toUpperCase()));
  }
  // Include any alias that maps to this skill or its base.
  for (const [alias, canonical] of Object.entries(SKILL_ALIASES)) {
    if (skillMatchKey(canonical) === skillMatchKey(normalized)) {
      variants.add(alias);
      variants.add(canonical);
    }
  }
  return Array.from(variants).filter(Boolean);
};

/**
 * True when a skill (or a known equivalent spelling) appears in content.
 * Fixes React vs React.js / ReactJS / Node vs Node.js false misses.
 */
export const skillAppearsIn = (content: string, skill: string): boolean => {
  if (!content?.trim() || !skill?.trim()) return false;

  const softened = content
    .replace(/[\u00ad\u200b\u200c\u200d\ufeff]/g, '')
    .replace(/\b([A-Za-z]{2,20})\s*\.\s*js\b/gi, '$1.js')
    .replace(/\b(React|Node|Next|Vue|Express)[\s._-]*js\b/gi, '$1.js');

  for (const variant of skillMatchVariants(skill)) {
    if (termAppearsInLocal(softened, variant)) return true;
  }

  // Compact overlap: resume "ReactJS" / "NodeJS" ↔ skill "React" / "Node.js"
  const want = compactSkillToken(skillMatchKey(skill) || skill);
  if (want.length < 2) return false;

  const extracted = extractProfessionalSkillsFromText(softened);
  for (const hit of extracted) {
    if (compactSkillToken(skillMatchKey(hit) || hit) === want) return true;
  }

  // Direct compact scan for glued tokens (ReactJS) that catalog word-boundaries miss.
  if (want.length >= 4) {
    const contentCompact = compactSkillToken(softened);
    if (contentCompact.includes(want)) return true;
    // Also accept content token that starts with skill base + js (reactjs for react)
    if (!want.endsWith('js')) {
      if (contentCompact.includes(`${want}js`)) return true;
    }
  }

  return false;
};

/** Local copy of word-aware match to avoid circular imports with resume-analysis. */
const termAppearsInLocal = (content: string, term: string): boolean => {
  const cleaned = term.trim();
  if (!cleaned || !content) return false;
  const escaped = cleaned.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  const startsWithWord = /^[A-Za-z0-9]/.test(cleaned);
  const endsWithWord = /[A-Za-z0-9]$/.test(cleaned);
  const prefix = startsWithWord ? '\\b' : '(?<![A-Za-z0-9])';
  const suffix = endsWithWord ? '\\b' : '(?![A-Za-z0-9])';
  try {
    return new RegExp(`${prefix}${escaped}${suffix}`, 'i').test(content);
  } catch {
    return content.toLowerCase().includes(cleaned.toLowerCase());
  }
};
