import path from 'node:path';
import { ResumeStorageDriverName, ParserEngine } from '@/modules/resumes/types/resume.types.js';

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resumeConfig = {
  storageDriver: (
    process.env.RESUME_STORAGE_DRIVER || 'LOCAL'
  ).toUpperCase() as ResumeStorageDriverName,
  parserEngine: (process.env.PARSER_ENGINE || 'RULE_BASED').toUpperCase() as ParserEngine,
  maxFileSizeBytes: toPositiveInt(process.env.RESUME_MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
  ai: {
    provider: (process.env.AI_RESUME_PARSER_PROVIDER || 'google').toLowerCase(),
    model: process.env.AI_RESUME_PARSER_MODEL || 'gemini-3.5-flash',
    temperature: Number(process.env.AI_RESUME_PARSER_TEMPERATURE ?? '0'),
    maxRetries: toPositiveInt(process.env.AI_RESUME_PARSER_MAX_RETRIES, 2),
    openrouter: {
      apiKey: process.env.OPENROUTER_API_KEY || '',
      model: process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini',
      baseUrl: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
      timeoutMs: toPositiveInt(process.env.OPENROUTER_TIMEOUT_MS, 60000),
    },
  },
  localStorageDir:
    process.env.RESUME_LOCAL_STORAGE_DIR || path.resolve(process.cwd(), 'storage', 'resumes'),
  s3: {
    bucket: process.env.RESUME_S3_BUCKET || '',
    region: process.env.AWS_REGION || 'us-east-1',
    prefix: process.env.RESUME_S3_PREFIX || 'users',
  },
};

export const allowedResumeMimeTypes = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export const allowedResumeExtensions = new Set(['.pdf', '.doc', '.docx']);
