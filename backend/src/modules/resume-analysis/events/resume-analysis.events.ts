export const RESUME_ANALYSIS_REQUESTED_EVENT = 'resume-analysis.requested.v1';

export type ResumeAnalysisRequestedPayload = {
  analysisId: number;
  resumeId: string;
  userId: string;
  targetRole: string;
  experienceLevel: string;
  jobDescription?: string;
};
