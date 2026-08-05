export type PreparedAnswerSource = 'USER_VERIFIED' | 'AI_GENERATED';

export type PreparedAnswerStatus = 'READY' | 'REQUIRES_USER_ACTION';

export interface PreparedScreeningAnswer {
  questionKey: string;
  questionLabel: string;
  answer: string | null;
  status: PreparedAnswerStatus;
  source: PreparedAnswerSource | null;
  /** 0–1; vault fills are 1.0; AI fills are lower and always require review. */
  confidence: number;
  evidence: string[];
  requiresUserReview: boolean;
}

export interface ApplicationContentPackage {
  coverLetter: string | null;
  screeningAnswers: PreparedScreeningAnswer[];
  contentGenerationAvailable: boolean;
  warnings: string[];
}

export interface ApplicationContentPreparationInput {
  userId: string;
  jobId: string;
  jobTitle: string | null;
  companySlug: string | null;
  resumeId: string | null;
}
