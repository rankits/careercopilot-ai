import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

vi.mock('html2canvas', () => ({
  default: vi.fn(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 10;
    canvas.height = 10;
    return canvas;
  }),
}));

vi.mock('jspdf', () => {
  const jsPDF = vi.fn().mockImplementation(function MockJsPDF(this: {
    internal: { pageSize: { getWidth: () => number; getHeight: () => number } };
    addPage: ReturnType<typeof vi.fn>;
    addImage: ReturnType<typeof vi.fn>;
    save: ReturnType<typeof vi.fn>;
  }) {
    this.internal = { pageSize: { getWidth: () => 595, getHeight: () => 842 } };
    this.addPage = vi.fn();
    this.addImage = vi.fn();
    this.save = vi.fn();
  });
  return { jsPDF };
});

describe('exportResume', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('downloads a txt resume with sanitized filename', () => {
    const click = vi.fn();
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL');
    const originalCreateElement = document.createElement.bind(document);
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
      return originalCreateElement(tag);
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
    const originalCreateElement = document.createElement.bind(document);
    vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'a') {
        return {
          click,
          href: '',
          download: '',
        } as unknown as HTMLAnchorElement;
      }
      return originalCreateElement(tag);
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

  it('prefers preview page capture when preview root is provided', async () => {
    const { jsPDF } = await import('jspdf');
    const preview = document.createElement('div');
    const page = document.createElement('div');
    page.className = 'preview-page';
    preview.appendChild(page);
    document.body.appendChild(preview);

    const draft = {
      ...createEmptyDraft('Engineer'),
      fullName: 'Alex Rivera',
    };

    await downloadResumePdf(draft, 'preview.pdf', 'modern', preview);
    expect(jsPDF).toHaveBeenCalled();
    preview.remove();
  });
});
