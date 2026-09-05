import { resumeService } from '@/modules/resumes/services/resume.service.js';
import { AppError } from '@/shared/utils/errors/AppError.js';

import type { MimeAttachment } from '@/modules/ai-mail/delivery/mime/mime-composer.js';

/** Gmail practical attachment guard (below API limits). */
export const MAX_RESUME_ATTACHMENT_BYTES = 10 * 1024 * 1024;

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
]);

export interface ResumeAttachmentResolver {
  resolve(input: { userId: string; resumeId: string }): Promise<MimeAttachment>;
}

export class ResumeFileAttachmentResolver implements ResumeAttachmentResolver {
  async resolve(input: { userId: string; resumeId: string }): Promise<MimeAttachment> {
    const file = await resumeService.downloadResume(input.resumeId, input.userId);

    if (file.buffer.byteLength === 0) {
      throw new AppError('Resume attachment is empty', 422, 'MAIL_ATTACHMENT_EMPTY');
    }

    if (file.buffer.byteLength > MAX_RESUME_ATTACHMENT_BYTES) {
      throw new AppError(
        'Resume attachment exceeds the maximum allowed size',
        422,
        'MAIL_ATTACHMENT_TOO_LARGE',
      );
    }

    if (!ALLOWED_MIME_TYPES.has(file.mimeType)) {
      throw new AppError(
        'Resume attachment MIME type is not allowed for email delivery',
        422,
        'MAIL_ATTACHMENT_UNSUPPORTED_TYPE',
      );
    }

    return {
      filename: file.originalName || `resume-${input.resumeId}.pdf`,
      mimeType: file.mimeType,
      content: file.buffer,
    };
  }
}

export const resumeFileAttachmentResolver = new ResumeFileAttachmentResolver();
