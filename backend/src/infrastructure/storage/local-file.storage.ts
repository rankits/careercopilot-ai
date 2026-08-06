import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  FileStorage,
  StoreFileInput,
  StoredFile,
} from '@/infrastructure/storage/file-storage.interface.js';

export class LocalFileStorage implements FileStorage {
  constructor(private readonly baseDir: string) {}

  async store(input: StoreFileInput): Promise<StoredFile> {
    const targetPath = path.join(this.baseDir, input.key);
    await fs.mkdir(path.dirname(targetPath), { recursive: true });
    await fs.writeFile(targetPath, input.buffer);

    return {
      key: input.key,
      url: `local://${input.key}`,
      driver: 'LOCAL',
    };
  }

  async retrieve(key: string): Promise<Buffer> {
    return fs.readFile(path.join(this.baseDir, key));
  }

  async delete(key: string): Promise<void> {
    await fs.unlink(path.join(this.baseDir, key));
  }
}
