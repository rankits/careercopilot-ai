import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { LocalFileStorage } from '@/infrastructure/storage/local-file.storage.js';

describe('LocalFileStorage', () => {
  let baseDir: string;
  let storage: LocalFileStorage;

  beforeEach(async () => {
    baseDir = await fs.mkdtemp(path.join(os.tmpdir(), 'careercopilot-file-storage-'));
    storage = new LocalFileStorage(baseDir);
  });

  afterEach(async () => {
    await fs.rm(baseDir, { recursive: true, force: true });
  });

  it('stores a file under a nested key, creating directories as needed', async () => {
    const result = await storage.store({
      buffer: Buffer.from('hello world'),
      key: 'users/u1/resumes/r1.txt',
      contentType: 'text/plain',
    });

    expect(result).toEqual({
      key: 'users/u1/resumes/r1.txt',
      url: 'local://users/u1/resumes/r1.txt',
      driver: 'LOCAL',
    });

    const written = await fs.readFile(path.join(baseDir, 'users/u1/resumes/r1.txt'), 'utf8');
    expect(written).toBe('hello world');
  });

  it('retrieves exactly what was stored', async () => {
    await storage.store({
      buffer: Buffer.from('round trip'),
      key: 'r2.txt',
      contentType: 'text/plain',
    });

    const buffer = await storage.retrieve('r2.txt');
    expect(buffer.toString('utf8')).toBe('round trip');
  });

  it('rejects retrieving a key that was never stored', async () => {
    await expect(storage.retrieve('missing.txt')).rejects.toThrow();
  });

  it('deletes a stored file so it can no longer be retrieved', async () => {
    await storage.store({
      buffer: Buffer.from('to be deleted'),
      key: 'r3.txt',
      contentType: 'text/plain',
    });

    await storage.delete('r3.txt');

    await expect(storage.retrieve('r3.txt')).rejects.toThrow();
  });

  it('rejects deleting a key that does not exist', async () => {
    await expect(storage.delete('never-existed.txt')).rejects.toThrow();
  });
});
