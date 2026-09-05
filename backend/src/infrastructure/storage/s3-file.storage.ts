import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type {
  FileStorage,
  StoreFileInput,
  StoredFile,
} from '@/infrastructure/storage/file-storage.interface.js';

export class S3FileStorage implements FileStorage {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor(config: { bucket: string; region: string }) {
    this.client = new S3Client({ region: config.region });
    this.bucket = config.bucket;
  }

  private assertBucketConfigured(): void {
    if (!this.bucket) {
      throw new AppError('An S3 bucket is required when using the S3 file storage driver', 500);
    }
  }

  async store(input: StoreFileInput): Promise<StoredFile> {
    this.assertBucketConfigured();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: input.key,
        Body: input.buffer,
        ContentType: input.contentType,
        ServerSideEncryption: 'AES256',
      }),
    );

    return {
      key: input.key,
      url: `s3://${this.bucket}/${input.key}`,
      driver: 'S3',
    };
  }

  async retrieve(key: string): Promise<Buffer> {
    this.assertBucketConfigured();

    const response = await this.client.send(
      new GetObjectCommand({ Bucket: this.bucket, Key: key }),
    );

    if (!response.Body) {
      throw new AppError('File not found in storage', 404);
    }

    const bytes = await response.Body.transformToByteArray();
    return Buffer.from(bytes);
  }

  async delete(key: string): Promise<void> {
    this.assertBucketConfigured();

    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }));
  }
}
