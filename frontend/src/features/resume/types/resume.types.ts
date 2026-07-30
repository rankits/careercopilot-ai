export interface ResumeProfileFormValues {
  certifications: string;
  currentCompany: string;
  designation: string;
  education: string;
  email: string;
  fullName: string;
  location: string;
  phone: string;
  projects: string;
  skills: string;
  summary: string;
  totalExperience: string;
  workExperience: string;
}

export interface ResumeUploadResponse {
  id: string;
  status: string;
}

export type ResumeProcessingStatus = 'FAILED' | 'PROCESSED' | 'PROCESSING' | 'UPLOADED';

export type ResumeParseStatus =
  | 'CHECKING_EXTRACTION'
  | 'COMPLETED'
  | 'EXTRACTING_TEXT'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'NORMALISING'
  | 'PARSING'
  | 'QUEUED'
  | 'VALIDATING';

export interface ResumeParseProgress {
  currentStep: ResumeParseStatus;
  progress: number;
  requiresReview: boolean;
  status: ResumeParseStatus;
  warnings: string[];
}

export interface ResumeParseCallbacks {
  onMetadata?: (metadata: ResumeParserMetadata) => void;
  onParsing?: () => void;
  onProgress?: (progress: ResumeParseProgress) => void;
  onUploaded?: (resumeId: string) => void;
  onUploadProgress?: (progress: number) => void;
}

export interface ResumeParserMetadata {
  confidenceScore: number | null;
  extractedData: Record<string, unknown>;
}

export interface ConfirmProfileInput {
  resumeId: string;
  userId: string;
}
