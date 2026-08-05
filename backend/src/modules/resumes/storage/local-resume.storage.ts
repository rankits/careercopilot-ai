import fs from 'node:fs/promises';
import path from 'node:path';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import {
  ResumeStorage,
  StoreResumeInput,
  StoredResume,
} from '@/modules/resumes/storage/resume-storage.interface.js';

export class LocalResumeStorage implements ResumeStorage {
  async store(input: StoreResumeInput): Promise<StoredResume> {
    const targetPath = path.join(resumeConfig.localStorageDir, input.key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, input.buffer);

    return {
      key: input.key,
      url: `local://${input.key}`,
      driver: 'LOCAL',
    };
  }

  async retrieve(key: string): Promise<Buffer> {
    const targetPath = path.join(resumeConfig.localStorageDir, key);
    return fs.readFile(targetPath);
  }
}
