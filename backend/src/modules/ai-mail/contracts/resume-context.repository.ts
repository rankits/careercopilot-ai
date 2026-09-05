export interface SafeResumeParseRecord {
  status: string;
  parsedData: unknown;
  extractedData: unknown;
}

export interface SafeResumeRecord {
  id: string;
  fileName: string;
  originalName?: string;
  status: string;
  uploadedAt: Date;
  updatedAt: Date;
  processedAt: Date | null;
  latestParse?: SafeResumeParseRecord;
}

export interface ResumeSelectionHints {
  sourceResumeId?: string;
  activeApprovedResumeId?: string;
}

export interface ResumeContextRepository {
  findForUser(resumeId: string, userId: string): Promise<SafeResumeRecord | null>;
  listForUser(userId: string): Promise<SafeResumeRecord[]>;
  selectionHints(userId: string): Promise<ResumeSelectionHints>;
}
