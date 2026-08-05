import { ResumeStorageDriverName } from '@/modules/resumes/types/resume.types.js';

export interface StoreResumeInput {
  buffer: Buffer;
  key: string;
  contentType: string;
}

export interface StoredResume {
  key: string;
  url: string;
  driver: ResumeStorageDriverName;
}

export interface ResumeStorage {
  store(input: StoreResumeInput): Promise<StoredResume>;
  retrieve(key: string): Promise<Buffer>;
}
