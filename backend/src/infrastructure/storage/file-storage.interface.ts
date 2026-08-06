export type FileStorageDriver = 'LOCAL' | 'S3';

export interface FileStorageConfig {
  driver: FileStorageDriver;
  localBaseDir: string;
  s3?: { bucket: string; region: string };
}

export interface StoreFileInput {
  buffer: Buffer;
  key: string;
  contentType: string;
}

export interface StoredFile {
  key: string;
  url: string;
  driver: FileStorageDriver;
}

export interface FileStorage {
  store(input: StoreFileInput): Promise<StoredFile>;
  retrieve(key: string): Promise<Buffer>;
  delete(key: string): Promise<void>;
}
