import { pdf } from '@react-pdf/renderer';

import { ResumePdfDocument } from './ResumePdfDocument';
import type { ResumeDraft, ResumeTemplateId } from './utils';

export async function downloadResumePdf(
  draft: ResumeDraft,
  fileName?: string,
  template: ResumeTemplateId = 'classic',
) {
  const blob = await pdf(<ResumePdfDocument draft={draft} template={template} />).toBlob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName || `${draft.fullName || 'resume'}.pdf`.replace(/\s+/g, '_');
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
