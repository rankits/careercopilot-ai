import path from "node:path";
import { ResumeStorageDriverName, ParserEngine } from "@/modules/resumes/types/resume.types.js";

const toPositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const resumeConfig = {
  storageDriver: (process.env.RESUME_STORAGE_DRIVER || "LOCAL").toUpperCase() as ResumeStorageDriverName,
  parserEngine: (process.env.PARSER_ENGINE || "RULE_BASED").toUpperCase() as ParserEngine,
  maxFileSizeBytes: toPositiveInt(process.env.RESUME_MAX_FILE_SIZE_MB, 10) * 1024 * 1024,
  localStorageDir:
    process.env.RESUME_LOCAL_STORAGE_DIR || path.resolve(process.cwd(), "storage", "resumes"),
  s3: {
    bucket: process.env.RESUME_S3_BUCKET || "",
    region: process.env.AWS_REGION || "us-east-1",
    prefix: process.env.RESUME_S3_PREFIX || "users",
  },
};

export const allowedResumeMimeTypes = new Set([
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
]);

export const allowedResumeExtensions = new Set([".pdf", ".doc", ".docx"]);
