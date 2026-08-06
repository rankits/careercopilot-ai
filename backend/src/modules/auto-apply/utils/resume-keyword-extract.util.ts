export const KEYWORD_EXTRACTOR_VERSION = 'kw-v2';

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'with',
  'without',
  'for',
  'from',
  'to',
  'of',
  'in',
  'on',
  'at',
  'by',
  'as',
  'is',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'this',
  'that',
  'these',
  'those',
  'it',
  'its',
  'we',
  'you',
  'your',
  'our',
  'their',
  'they',
  'them',
  'will',
  'would',
  'can',
  'could',
  'should',
  'may',
  'might',
  'must',
  'have',
  'has',
  'had',
  'do',
  'does',
  'did',
  'not',
  'no',
  'yes',
  'all',
  'any',
  'some',
  'such',
  'than',
  'then',
  'there',
  'here',
  'when',
  'where',
  'which',
  'who',
  'whom',
  'what',
  'how',
  'into',
  'over',
  'under',
  'about',
  'across',
  'after',
  'before',
  'between',
  'during',
  'through',
  'via',
  'using',
  'use',
  'used',
  'new',
  'based',
  'work',
  'working',
  'team',
  'teams',
  'role',
  'roles',
  'job',
  'ability',
  'able',
  'strong',
  'excellent',
  'good',
  'great',
  'including',
  'include',
  'includes',
  'related',
  'relevant',
  'required',
  'require',
  'requirements',
  'preferred',
  'prefer',
  'experience',
  'experiences',
  'year',
  'years',
  'plus',
  'etc',
  'etcetera',
  'driven',
  'well',
  'within',
  'across',
  'other',
  'others',
  'also',
  'etc',
]);

/** Short tech tokens that must not be dropped by length filters. */
const SHORT_TECH = new Set(['r', 'c', 'go', 'ai', 'ml', 'bi', 'qa', 'ui', 'ux', 'aws', 'gcp', 'sql']);

const MULTIWORD_PHRASES = [
  'machine learning',
  'deep learning',
  'data science',
  'data pipelines',
  'data pipeline',
  'statistical modeling',
  'product management',
  'project management',
  'stakeholder communication',
  'distributed systems',
  'system design',
  'software engineering',
  'cloud computing',
  'natural language processing',
  'computer vision',
  'unit testing',
  'continuous integration',
  'continuous delivery',
  'rest api',
  'rest apis',
  'object oriented',
  'design systems',
  'mobile design',
  'user research',
  'a/b testing',
  'ab testing',
  'etl pipelines',
  'feature engineering',
];

function normalizeToken(raw: string): string {
  return raw
    .toLowerCase()
    .replace(/^[^a-z0-9+#./]+|[^a-z0-9+#./]+$/g, '')
    .trim();
}

function isUsefulToken(token: string): boolean {
  if (!token) return false;
  if (STOPWORDS.has(token)) return false;
  if (SHORT_TECH.has(token)) return true;
  if (token.length < 3) return false;
  if (/^\d+$/.test(token)) return false;
  return true;
}

/**
 * Extract meaningful job-specific keywords/phrases from requirement + JD text.
 * Never returns stopwords like "the", "and", "with", "team".
 */
export function extractJobKeywords(input: {
  jobTitle?: string;
  jobDescription?: string;
  requirementTexts?: string[];
}): string[] {
  const corpus = [
    input.jobTitle ?? '',
    ...(input.requirementTexts ?? []),
    // Prefer requirement texts; sample JD lightly for tech phrases only.
    (input.jobDescription ?? '').slice(0, 4000),
  ]
    .join('\n')
    .toLowerCase();

  const found = new Set<string>();

  for (const phrase of MULTIWORD_PHRASES) {
    if (corpus.includes(phrase)) found.add(phrase);
  }

  const tokens = corpus
    .replace(/[^a-z0-9+#.\/\s-]/g, ' ')
    .split(/[\s,/|;]+/)
    .map(normalizeToken)
    .filter(isUsefulToken);

  for (const token of tokens) {
    // Prefer phrase form when already captured
    if ([...found].some((p) => p.includes(token) && p !== token)) continue;
    found.add(token);
  }

  return [...found].slice(0, 40);
}
