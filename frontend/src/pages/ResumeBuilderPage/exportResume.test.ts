import { beforeEach, describe, expect, it, vi } from 'vitest';

import { downloadResumePdf, downloadResumeTxt } from './exportResume';
import { createEmptyDraft } from './utils';

vi.mock('@react-pdf/renderer', () => ({
  pdf: vi.fn(() => ({
    toBlob: vi.fn(() => Promise.resolve(new Blob(['pdf'], { type: 'application/pdf' }))),
  })),
  Document: ({ children }: { children: unknown }) => children,
  Page: ({ children }: { children: unknown }) => children,
  Text: ({ children }: { children: unknown }) => children,
  View: ({ children }: { children: unknown }) => children,
  StyleSheet: { create: (styles: unknown) => styles },
}));

describe('exportResume', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  it('downloads a txt resume with sanitized filename', async () => {
    const click = vi.fn();
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click,
          set href(_value: string) {},
          get href() {
            return '';
          },
          set download(_value: string) {},
          get download() {
            return 'Alex_Rivera.txt';
          },
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    const draft = {
      ...createEmptyDraft('Engineer'),
      fullName: 'Alex Rivera',
      originalText: 'Hello resume',
    };

    downloadResumeTxt(draft, 'Professional summary\nJava engineer');

    expect(click).toHaveBeenCalled();
    expect(revokeSpy).toHaveBeenCalledWith('blob:mock-url');
  });

  it('downloads a pdf resume via react-pdf', async () => {
    const click = vi.fn();
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }
      return document.createElement(tag);
    });

    const draft = {
      ...createEmptyDraft('Engineer'),
      fullName: 'Alex Rivera',
      summary: 'Backend engineer',
      skillsList: ['Java', 'React'],
      experiences: [
        {
          id: 'e1',
          company: 'Acme',
          title: 'Engineer',
          startDate: '2022',
          endDate: 'Present',
          details: 'Built APIs',
        },
      ],
      projectsList: [],
      customFields: [],
    };

    await downloadResumePdf(draft, undefined, 'classic');
    expect(click).toHaveBeenCalled();
  });
});
