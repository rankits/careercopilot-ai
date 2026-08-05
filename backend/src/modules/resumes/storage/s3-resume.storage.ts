import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { AppError } from '@/shared/utils/errors/AppError.js';
import { resumeConfig } from '@/modules/resumes/config/resume.config.js';
import {
  ResumeStorage,
  StoreResumeInput,
  StoredResume,
} from '@/modules/resumes/storage/resume-storage.interface.js';

export class S3ResumeStorage implements ResumeStorage {
  private readonly client = new S3Client({ region: resumeConfig.s3.region });

  async store(input: StoreResumeInput): Promise<StoredResume> {
    if (!resumeConfig.s3.bucket) {
      throw new AppError('RESUME_S3_BUCKET is required when RESUME_STORAGE_DRIVER=S3', 500);
    }

    await this.client.send(
      new PutObjectCommand({
        Bucket: resumeConfig.s3.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        ServerSideEncryption: 'AES256',
      }),
    );

    return {
      key: input.key,
      url: `s3://${resumeConfig.s3.bucket}/${input.key}`,
      driver: 'S3',
    };
  }

  async retrieve(key: string): Promise<Buffer> {
    if (!resumeConfig.s3.bucket) {
      throw new AppError('RESUME_S3_BUCKET is required when RESUME_STORAGE_DRIVER=S3', 500);
    }

    const response = await this.client.send(
      new GetObjectCommand({
        Bucket: resumeConfig.s3.bucket,
        Key: key,
      }),
    );

    if (!response.Body) {
      throw new AppError('Resume file not found in storage', 404);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }
}
