import { promises as fs } from 'fs';
import path from 'path';

export interface ResumeStorageConfig {
  driver: 'local';
  localBasePath: string;
}

export interface StoreResumeInput {
  buffer: Buffer;
  originalName: string;
  mimeType: string;
  resumeId: string;
  userId: string;
}

export interface StoreResumeResult {
  path: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
}

export class ResumeStorageService {
  private readonly config: ResumeStorageConfig;

  constructor(config: ResumeStorageConfig) {
    this.config = config;
  }

  async store(input: StoreResumeInput): Promise<StoreResumeResult> {
    const ext = path.extname(input.originalName) || '.bin';
    const filename = `${input.userId}-${input.resumeId}${ext}`;
    const filePath = path.join(this.config.localBasePath, filename);

    await fs.writeFile(filePath, input.buffer);

    return {
      path: filePath,
      url: `/resumes/${input.resumeId}/${filename}`,
      mimeType: input.mimeType,
      sizeBytes: input.buffer.byteLength,
    };
  }
}
