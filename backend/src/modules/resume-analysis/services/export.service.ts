import JSZip from 'jszip';

import { prisma } from '@/shared/config/db.conf.js';
import { AppError } from '@/shared/utils/errors/AppError.js';
import type { ExportResult } from '@/modules/resume-analysis/types/resume-analysis.types.js';
import {
  assertOwnedResume,
  getResumeText,
  ownedAnalysisWhere,
} from '@/modules/resume-analysis/services/resume-analysis.shared.js';

const buildExportContent = (input: {
  baseName: string;
  targetRole?: string;
  atsScore?: number;
  content: string;
}) =>
  [
    `=== ${input.baseName} ===`,
    `Optimized for: ${input.targetRole ?? 'N/A'}`,
    `ATS Score: ${input.atsScore ?? 0}/100`,
    '',
    input.content,
  ].join('\n');

/** Escape XML text nodes for WordprocessingML. */
const escapeXml = (value: string): string =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');

/**
 * Build a minimal valid .docx (OOXML zip) so re-upload via mammoth extracts plain text.
 * Previous implementation returned raw UTF-8 bytes with a docx MIME type — unreadable on re-upload.
 */
const buildDocxBase64 = async (plainText: string): Promise<string> => {
  const paragraphs = plainText
    .split(/\r?\n/)
    .map((line) => {
      const text = escapeXml(line);
      if (!text) {
        return `<w:p><w:pPr><w:spacing w:after="0"/></w:pPr></w:p>`;
      }
      return `<w:p><w:r><w:t xml:space="preserve">${text}</w:t></w:r></w:p>`;
    })
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    ${paragraphs}
    <w:sectPr/>
  </w:body>
</w:document>`;

  const contentTypes = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const rels = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const zip = new JSZip();
  zip.file('[Content_Types].xml', contentTypes);
  zip.folder('_rels')?.file('.rels', rels);
  zip.folder('word')?.file('document.xml', documentXml);

  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return Buffer.from(buffer).toString('base64');
};

export const exportService = {
  async exportResume(
    resumeId: string,
    userId: string,
    format: 'pdf' | 'docx' | 'txt',
  ): Promise<ExportResult> {
    const resume = await assertOwnedResume(resumeId, userId);

    const analysis = await prisma.resumeAnalysis.findFirst({
      where: ownedAnalysisWhere(resumeId, userId),
      include: { keywords: true },
    });

    const resumeText = await getResumeText(resumeId, userId);
    const baseName = resume.originalName.replace(/\.[^.]+$/, '');
    const content = buildExportContent({
      baseName,
      targetRole: analysis?.targetRole,
      atsScore: analysis?.atsScore,
      content: analysis?.editedContent ?? resumeText,
    });

    if (format === 'txt') {
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'text/plain',
        fileName: `${baseName}_optimized.txt`,
      };
    }

    if (format === 'pdf') {
      // Text payload with PDF mime kept for API compatibility; FE prefers react-pdf for PDF.
      return {
        content: Buffer.from(content).toString('base64'),
        mimeType: 'application/pdf',
        fileName: `${baseName}_optimized.pdf`,
      };
    }

    if (format === 'docx') {
      return {
        content: await buildDocxBase64(content),
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileName: `${baseName}_optimized.docx`,
      };
    }

    throw new AppError('Unsupported export format', 400);
  },
};
