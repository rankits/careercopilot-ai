import { describe, expect, it } from 'vitest';
import { createFileStorage } from '@/infrastructure/storage/storage.factory.js';
import { LocalFileStorage } from '@/infrastructure/storage/local-file.storage.js';
import { S3FileStorage } from '@/infrastructure/storage/s3-file.storage.js';

describe('createFileStorage', () => {
  it('returns a LocalFileStorage when driver is LOCAL', () => {
    const storage = createFileStorage({ driver: 'LOCAL', localBaseDir: '/tmp/whatever' });
    expect(storage).toBeInstanceOf(LocalFileStorage);
  });

  it('returns an S3FileStorage when driver is S3', () => {
    const storage = createFileStorage({
      driver: 'S3',
      localBaseDir: '/tmp/whatever',
      s3: { bucket: 'my-bucket', region: 'us-east-1' },
    });
    expect(storage).toBeInstanceOf(S3FileStorage);
  });
});
