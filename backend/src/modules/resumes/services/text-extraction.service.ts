import path from 'node:path';
import mammoth from 'mammoth';
import { PDFParse } from 'pdf-parse';
import { AppError } from '@/shared/utils/errors/AppError.js';

export const textExtractionService = {
  async extractText(input: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<string> {
    const extension = path.extname(input.fileName).toLowerCase();

    if (input.mimeType === 'application/pdf' || extension === '.pdf') {
      const parser = new PDFParse({ data: input.buffer });
      try {
        const result = await parser.getText();
        return result.text.trim();
      } finally {
        await parser.destroy();
      }
    }

    if (
      input.mimeType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      extension === '.docx'
    ) {
      const result = await mammoth.extractRawText({ buffer: input.buffer });
      return result.value.trim();
    }

    if (input.mimeType === 'application/msword' || extension === '.doc') {
      return input.buffer
        .toString('utf8')
        .replace(/[^\x09\x0A\x0D\x20-\x7E]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
    }

    throw new AppError('Unsupported resume file type', 400);
  },
};
