/**
 * Resume skill taxonomy — only catalog skills are used for extraction,
 * ATS matching, and AI skill recommendations.
 */

const SHORT_ALLOWED = new Set(
  ['c', 'c++', 'c#', 'r', 'go', 'ai', 'ml', 'ui', 'ux', 'sql', 'aws', 'gcp', 'jvm', 'jpa', 'jwt', 's3'].map(
    (item) => item.toLowerCase(),
  ),
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
  'react.js': 'React.js',
  'react native': 'React Native',
  vue: 'Vue.js',
  vuejs: 'Vue.js',
  'vue.js': 'Vue.js',
  nextjs: 'Next.js',
  'next.js': 'Next.js',
  express: 'Express.js',
  expressjs: 'Express.js',
  'express.js': 'Express.js',
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

const catalogByKey = new Map(
  SKILL_CATALOG.map((skill) => [skill.toLowerCase(), skill] as const),
);

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
  if (key.length < 2 && !SHORT_ALLOWED.has(key)) return null;
  if (key.length === 2 && !SHORT_ALLOWED.has(key) && !catalogByKey.has(key)) return null;

  const aliased = SKILL_ALIASES[aliasKey(cleaned)] ?? SKILL_ALIASES[key];
  if (aliased) return aliased;

  const catalogHit = catalogByKey.get(key);
  if (catalogHit) return catalogHit;

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

  const candidates = text
    .replace(/[•●]/g, ',')
    .split(/[,|;\n/]+/)
    .map((part) =>
      part
        .replace(
          /^(?:required|preferred|skills?|technologies|tools|requirements?|qualifications?|experience with|knowledge of|proficient in)\s*:?\s*/i,
          '',
        )
        .trim(),
    )
    .filter(Boolean);

  const multiWordHits: string[] = [];
  for (const skill of SKILL_CATALOG) {
    if (skill.split(/\s+/).length < 2 && !skill.includes('.') && !skill.includes('/')) continue;
    const pattern = new RegExp(
      `\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+')}\\b`,
      'i',
    );
    if (pattern.test(text)) multiWordHits.push(skill);
  }

  const knownShapeMatches =
    text.match(/\b(?:C\+\+|C#|\.NET|CI\/CD|Node\.js|Next\.js|Vue\.js|Express\.js|React\.js)\b/gi) ??
    [];

  return normalizeProfessionalSkills([...candidates, ...multiWordHits, ...knownShapeMatches]);
};
