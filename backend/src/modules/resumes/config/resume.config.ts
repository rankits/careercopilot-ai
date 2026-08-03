import path from 'node:path';
import { ResumeStorageDriverName, ParserEngine } from '@/modules/resumes/types/resume.types.js';

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const resolveLocalStorageDir = () => {
  const configuredDir = process.env.RESUME_LOCAL_STORAGE_DIR;
  if (!configuredDir) return path.resolve(process.cwd(), 'storage', 'resumes');

  if (process.platform === 'win32' && configuredDir.startsWith('/app/')) {
    return path.resolve(process.cwd(), configuredDir.replace(/^\/app\//, ''));
  }

  return configuredDir;
};

export const resumeConfig = {
  storageDriver: (
    process.env.RESUME_STORAGE_DRIVER || 'LOCAL'
  ).toUpperCase() as ResumeStorageDriverName,
  parserEngine: (process.env.PARSER_ENGINE || 'RULE_BASED').toUpperCase() as ParserEngine,
  maxFileSizeBytes: toPositiveInt(process.env.RESUME_MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
  ai: {
    provider: (process.env.AI_RESUME_PARSER_PROVIDER || 'google').toLowerCase(),
    model: process.env.AI_RESUME_PARSER_MODEL || 'gemini-2.0-flash',
    temperature: Number(process.env.AI_RESUME_PARSER_TEMPERATURE ?? '0'),
    maxRetries: toPositiveInt(process.env.AI_RESUME_PARSER_MAX_RETRIES, 2),
  },
  localStorageDir: resolveLocalStorageDir(),
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
  'text/plain',
]);

export const allowedResumeExtensions = new Set(['.pdf', '.doc', '.docx', '.txt']);
