import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSend = vi.fn();

class FakeCommand<T> {
  constructor(public readonly input: T) {}
}

class FakeS3Client {
  send = mockSend;
}

vi.mock('@aws-sdk/client-s3', () => ({
  S3Client: FakeS3Client,
  PutObjectCommand: FakeCommand,
  GetObjectCommand: FakeCommand,
  DeleteObjectCommand: FakeCommand,
}));

const { S3FileStorage } = await import('@/infrastructure/storage/s3-file.storage.js');
const { PutObjectCommand, GetObjectCommand, DeleteObjectCommand } =
  await import('@aws-sdk/client-s3');

describe('S3FileStorage', () => {
  beforeEach(() => {
    mockSend.mockReset();
  });

  it('rejects store/retrieve/delete when no bucket is configured', async () => {
    const storage = new S3FileStorage({ bucket: '', region: 'us-east-1' });

    await expect(
      storage.store({ buffer: Buffer.from('x'), key: 'k', contentType: 'text/plain' }),
    ).rejects.toMatchObject({ statusCode: 500 });
    await expect(storage.retrieve('k')).rejects.toMatchObject({ statusCode: 500 });
    await expect(storage.delete('k')).rejects.toMatchObject({ statusCode: 500 });
    expect(mockSend).not.toHaveBeenCalled();
  });

  it('stores with server-side encryption and returns an s3:// url', async () => {
    mockSend.mockResolvedValue({});
    const storage = new S3FileStorage({ bucket: 'my-bucket', region: 'us-east-1' });

    const result = await storage.store({
      buffer: Buffer.from('hello'),
      key: 'users/u1/resumes/r1.pdf',
      contentType: 'application/pdf',
    });

    expect(result).toEqual({
      key: 'users/u1/resumes/r1.pdf',
      url: 's3://my-bucket/users/u1/resumes/r1.pdf',
      driver: 'S3',
    });

    const sentCommand = mockSend.mock.calls[0]![0] as InstanceType<typeof PutObjectCommand>;
    expect(sentCommand).toBeInstanceOf(PutObjectCommand);
    expect(sentCommand.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'users/u1/resumes/r1.pdf',
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    });
  });

  it('retrieves and buffers the object body', async () => {
    mockSend.mockResolvedValue({
      Body: { transformToByteArray: async () => new Uint8Array([1, 2, 3]) },
    });
    const storage = new S3FileStorage({ bucket: 'my-bucket', region: 'us-east-1' });

    const buffer = await storage.retrieve('users/u1/resumes/r1.pdf');

    expect(buffer).toEqual(Buffer.from([1, 2, 3]));
    const sentCommand = mockSend.mock.calls[0]![0] as InstanceType<typeof GetObjectCommand>;
    expect(sentCommand).toBeInstanceOf(GetObjectCommand);
    expect(sentCommand.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'users/u1/resumes/r1.pdf',
    });
  });

  it('throws a 404 when the object has no body', async () => {
    mockSend.mockResolvedValue({ Body: undefined });
    const storage = new S3FileStorage({ bucket: 'my-bucket', region: 'us-east-1' });

    await expect(storage.retrieve('missing.pdf')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('deletes the object by key', async () => {
    mockSend.mockResolvedValue({});
    const storage = new S3FileStorage({ bucket: 'my-bucket', region: 'us-east-1' });

    await storage.delete('users/u1/resumes/r1.pdf');

    const sentCommand = mockSend.mock.calls[0]![0] as InstanceType<typeof DeleteObjectCommand>;
    expect(sentCommand).toBeInstanceOf(DeleteObjectCommand);
    expect(sentCommand.input).toMatchObject({
      Bucket: 'my-bucket',
      Key: 'users/u1/resumes/r1.pdf',
    });
  });
});
