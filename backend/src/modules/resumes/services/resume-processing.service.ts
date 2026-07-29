import { resumeParsingOrchestrator } from '@/modules/resumes/services/resume-parsing.orchestrator.js';

export const resumeProcessingService = {
  async processUploadedResume(input: {
    resumeId: string;
    userId: string;
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  }): Promise<void> {
    await resumeParsingOrchestrator.parseUploadedResume(input);
  },
};
