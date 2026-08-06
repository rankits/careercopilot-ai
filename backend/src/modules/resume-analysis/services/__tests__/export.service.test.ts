import { beforeEach, describe, expect, it, vi } from 'vitest';
import mammoth from 'mammoth';

const h = vi.hoisted(() => ({
  assertOwnedResume: vi.fn(),
  getResumeText: vi.fn(),
  findFirst: vi.fn(),
}));

vi.mock('@/modules/resume-analysis/services/resume-analysis.shared.js', () => ({
  assertOwnedResume: h.assertOwnedResume,
  getResumeText: h.getResumeText,
  ownedAnalysisWhere: (resumeId: string, userId: string) => ({ resumeId, resume: { userId } }),
}));

vi.mock('@/shared/config/db.conf.js', () => ({
  prisma: {
    resumeAnalysis: {
      findFirst: h.findFirst,
    },
  },
}));

import { exportService } from '@/modules/resume-analysis/services/export.service.js';

describe('exportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    h.assertOwnedResume.mockResolvedValue({ id: 'r1', originalName: 'resume.pdf' });
    h.getResumeText.mockResolvedValue('SKILLS\nReact, TypeScript\n\nSummary text');
    h.findFirst.mockResolvedValue({
      targetRole: 'React Developer',
      atsScore: 72,
      editedContent:
        'SKILLS\nReact, TypeScript, Node.js\n\nPROFESSIONAL SUMMARY\nFrontend engineer.',
    });
  });

  it('exports a real DOCX that mammoth can re-extract skills from', async () => {
    const result = await exportService.exportResume('r1', 'u1', 'docx');
    expect(result.mimeType).toContain('wordprocessingml');
    expect(result.fileName).toMatch(/\.docx$/);

    const buffer = Buffer.from(result.content, 'base64');
    const extracted = await mammoth.extractRawText({ buffer });
    expect(extracted.value).toMatch(/React/i);
    expect(extracted.value).toMatch(/TypeScript/i);
    expect(extracted.value).toMatch(/Node\.js/i);
  });

  it('exports plain text for txt format', async () => {
    const result = await exportService.exportResume('r1', 'u1', 'txt');
    const text = Buffer.from(result.content, 'base64').toString('utf8');
    expect(text).toContain('React');
    expect(result.mimeType).toBe('text/plain');
  });
});
