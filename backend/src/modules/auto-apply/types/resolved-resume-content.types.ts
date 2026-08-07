export type ResumeContentSource = 'UPLOADED_EXTRACTION' | 'BUILDER_VERSION';

export type ResolvedResumeContent = {
  approvedResumeVersionId: string;
  resumeId: string;
  source: ResumeContentSource;
  builderVersionId?: number;
  text: string;
  contentHash: string;
  updatedAt: Date;
};
