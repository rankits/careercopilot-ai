import { afterEach, describe, expect, it, vi } from 'vitest';

const originalEnv = { ...process.env };

const importMailer = async () => (await import('@/shared/config/mailer.conf.js')).mailerConfig;

const importSwagger = async () => (await import('@/shared/config/swagger.conf.js')).swaggerSpec;

const withEnv = async <T>(
  overrides: Record<string, string>,
  importFn: () => Promise<T>,
): Promise<T> => {
  process.env = { ...originalEnv, ...overrides };
  vi.resetModules();
  const mod = await importFn();
  process.env = { ...originalEnv };
  return mod;
};

describe('mailer.conf', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('defaults to a local dev SMTP config with no auth', async () => {
    const cfg = await withEnv({ SMTP_USER: '', SMTP_PASS: '' }, importMailer);
    expect(cfg.host).toBe('localhost');
    expect(cfg.port).toBe(1025);
    expect(cfg.secure).toBe(false);
    expect(cfg.auth).toBeUndefined();
    expect(cfg.from).toEqual({ name: 'CareerCopilot', address: 'no-reply@careercopilot.dev' });
  });

  it('includes auth credentials when both SMTP_USER and SMTP_PASS are set', async () => {
    const cfg = await withEnv(
      {
        SMTP_USER: 'smtp-user',
        SMTP_PASS: 'smtp-pass',
        SMTP_HOST: 'smtp.example.com',
        SMTP_PORT: '465',
        SMTP_SECURE: 'true',
      },
      importMailer,
    );
    expect(cfg.auth).toEqual({ user: 'smtp-user', pass: 'smtp-pass' });
    expect(cfg.host).toBe('smtp.example.com');
    expect(cfg.port).toBe(465);
    expect(cfg.secure).toBe(true);
  });

  it('omits auth when only one of user/pass is present', async () => {
    const cfg = await withEnv({ SMTP_USER: 'smtp-user', SMTP_PASS: '' }, importMailer);
    expect(cfg.auth).toBeUndefined();
  });
});

describe('swagger.conf', () => {
  afterEach(() => {
    process.env = { ...originalEnv };
    vi.resetModules();
  });

  it('uses the localhost server url when BASE_URL is unset', async () => {
    const spec = await withEnv({ BASE_URL: '' }, importSwagger);
    expect(spec.openapi).toBe('3.0.0');
    expect(spec.servers[0].url).toBe('http://localhost:5001');
    expect(spec.security).toEqual([{ BearerAuth: [] }]);
    expect(spec.components.securitySchemes.BearerAuth).toBeDefined();
    expect(spec.paths).toBeDefined();
  });

  it('uses BASE_URL when set', async () => {
    const spec = await withEnv({ BASE_URL: 'https://api.careercopilot.com' }, importSwagger);
    expect(spec.servers[0].url).toBe('https://api.careercopilot.com');
    expect(spec.servers[0].description).toContain('test');
  });
});
