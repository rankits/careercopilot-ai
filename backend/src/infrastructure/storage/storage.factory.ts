import { LocalFileStorage } from '@/infrastructure/storage/local-file.storage.js';
import { S3FileStorage } from '@/infrastructure/storage/s3-file.storage.js';
import type {
  FileStorage,
  FileStorageConfig,
} from '@/infrastructure/storage/file-storage.interface.js';

export const createFileStorage = (config: FileStorageConfig): FileStorage => {
  if (config.driver === 'S3') {
    return new S3FileStorage(config.s3 ?? { bucket: '', region: 'us-east-1' });
  }

  return new LocalFileStorage(config.localBaseDir);
};
