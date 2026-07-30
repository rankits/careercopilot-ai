import { vi } from 'vitest';

/**
 * `pdf-parse` pulls in `pdfjs-dist`, which expects browser DOM globals
 * (DOMMatrix/ImageData/Path2D) that don't exist in Vitest's Node
 * environment - just importing `@/app.js` (which wires the resumes
 * module's routes, which imports the text-extraction service, which
 * imports `pdf-parse`) crashes every test file at module-load time
 * regardless of what it actually tests. None of the auth/user/admin specs
 * exercise resume parsing, so this is a pure "don't crash on import" stub.
 */
vi.mock('pdf-parse', () => ({
  PDFParse: class {
    async getText() {
      return { text: '' };
    }
    async destroy() {}
  },
}));
