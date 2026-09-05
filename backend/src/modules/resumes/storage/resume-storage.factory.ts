import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import { createFileStorage } from '@/infrastructure/storage/storage.factory.js';
import type { FileStorage } from '@/infrastructure/storage/file-storage.interface.js';

export const createResumeStorage = (): FileStorage =>
  createFileStorage({
    driver: resumeConfig.storageDriver,
    localBaseDir: resumeConfig.localStorageDir,
    s3: { bucket: resumeConfig.s3.bucket, region: resumeConfig.s3.region },
  });
