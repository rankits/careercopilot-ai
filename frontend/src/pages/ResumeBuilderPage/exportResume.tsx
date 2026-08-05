import { pdf } from '@react-pdf/renderer';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

import { ResumePdfDocument } from './ResumePdfDocument';
import type { ResumeDraft, ResumeTemplateId } from './utils';

function resolveFileName(draft: ResumeDraft, fileName?: string) {
  return fileName || `${draft.fullName || 'resume'}.pdf`.replace(/\s+/g, '_');
}

/**
 * Capture live preview A4 pages (`.preview-page`) so the PDF matches what the user sees.
 */
export async function downloadPreviewAsPdf(
  previewRoot: HTMLElement,
  fileName = 'resume.pdf',
): Promise<boolean> {
  const pages = Array.from(previewRoot.querySelectorAll<HTMLElement>('.preview-page'));
  if (pages.length === 0) return false;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  for (let index = 0; index < pages.length; index += 1) {
    const page = pages[index]!;
    const previousTransform = page.style.transform;
    const previousOrigin = page.style.transformOrigin;
    // Capture at full A4 CSS size (preview may be scaled down on screen).
    page.style.transform = 'none';
    page.style.transformOrigin = 'top left';

    try {
      const canvas = await html2canvas(page, {
        backgroundColor: '#ffffff',
        scale: 2,
        useCORS: true,
        logging: false,
        width: page.offsetWidth || undefined,
        height: page.offsetHeight || undefined,
      });
      const img = canvas.toDataURL('image/png');
      if (index > 0) doc.addPage();
      doc.addImage(img, 'PNG', 0, 0, pageWidth, pageHeight, undefined, 'FAST');
    } finally {
      page.style.transform = previousTransform;
      page.style.transformOrigin = previousOrigin;
    }
  }

  doc.save(fileName);
  return true;
}

export async function downloadResumePdf(
  draft: ResumeDraft,
  fileName?: string,
  template: ResumeTemplateId = 'classic',
  previewRoot?: HTMLElement | null,
) {
  const name = resolveFileName(draft, fileName);

  if (previewRoot) {
    const captured = await downloadPreviewAsPdf(previewRoot, name);
    if (captured) return;
  }

  const blob = await pdf(<ResumePdfDocument draft={draft} template={template} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  link.click();
  URL.revokeObjectURL(url);
}

export function downloadResumeTxt(draft: ResumeDraft, content: string, fileName?: string) {
  const blob = new Blob([content || draft.originalText], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${draft.fullName || 'resume'}.txt`.replace(/\s+/g, '_');
  link.click();
  URL.revokeObjectURL(url);
}
