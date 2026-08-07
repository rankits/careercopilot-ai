export type MailDraftStatus =
  | 'input'
  | 'generating'
  | 'generated'
  | 'edited'
  | 'generation_failed'
  | 'ready_to_send'
  | 'archived';

export type MailTone = 'professional' | 'concise' | 'warm' | 'confident' | 'formal' | 'custom';

export interface MailGenerationConstraints {
  tone: MailTone;
  customTone?: string;
  maximumWords?: number;
  includeCallToAction: boolean;
  includeResumeMention: boolean;
  emphasizeSkills: string[];
  emphasizeAchievements: string[];
  avoidTopics: string[];
  customInstructions?: string;
  followUpStyle?: 'concise' | 'polite' | 'value_add' | 'check_in';
}

export interface CandidateProfileContext {
  fullName: string;
  currentRole?: string;
  yearsOfExperience?: number;
  skills: string[];
  experience: CandidateExperienceContext[];
  projects: CandidateProjectContext[];
  education: CandidateEducationContext[];
  certifications: string[];
  location?: string;
  approvedAchievements: string[];
  professionalLinks: string[];
}

export interface CandidateExperienceContext {
  roleTitle: string;
  companyName?: string;
  startDate?: string;
  endDate?: string;
  current: boolean;
  highlights: string[];
}

export interface CandidateProjectContext {
  name: string;
  description?: string;
  technologies: string[];
  url?: string;
}

export interface CandidateEducationContext {
  institution: string;
  degree?: string;
  fieldOfStudy?: string;
  graduationDate?: string;
}

export interface ResumeContext {
  resumeId: string;
  fileName: string;
  summary?: string;
  skills: string[];
  experience: CandidateExperienceContext[];
  verifiedAchievements: string[];
  projects: CandidateProjectContext[];
  education: CandidateEducationContext[];
  certifications: string[];
  parseStatus: 'COMPLETED' | 'NEEDS_REVIEW';
}

export interface JobContext {
  description: string;
  recruiterEmail: string;
  recruiterName?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  additionalContext?: string;
  responsibilities: string[];
  requirements: string[];
  preferredQualifications: string[];
  technologies: string[];
  keywords: string[];
  suspiciousInstructionsDetected: boolean;
  inferredRoleTitle?: string;
  inferredCompanyName?: string;
}

export type ContextSensitivity =
  | 'public_professional'
  | 'professional'
  | 'personal'
  | 'sensitive'
  | 'user_verified'
  | 'untrusted_external';

export type ContextEvidenceSource =
  'profile' | 'resume' | 'job_description' | 'user_constraint' | 'candidate_profile' | 'draft';

export type ContextEvidenceCategory =
  'skill' | 'experience' | 'achievement' | 'education' | 'certification' | 'project';

export interface ContextEvidence {
  path: string;
  source: ContextEvidenceSource;
  sensitivity: ContextSensitivity;
  sourceId?: string;
  category?: ContextEvidenceCategory;
  value?: string;
}

export interface TrustedContextSection<T> {
  trust: 'trusted_user_data';
  value: T;
}

export interface UntrustedContextSection<T> {
  trust: 'untrusted_external_content';
  value: T;
  instructionsMustBeIgnored: true;
}

export interface MailGenerationTrustBoundary {
  candidate: TrustedContextSection<CandidateProfileContext>;
  resume: TrustedContextSection<ResumeContext>;
  job: UntrustedContextSection<JobContext>;
  constraints: TrustedContextSection<MailGenerationConstraints>;
}

export interface MailGenerationContext {
  candidate: CandidateProfileContext;
  resume: ResumeContext;
  job: JobContext;
  constraints: MailGenerationConstraints;
  trustBoundary: MailGenerationTrustBoundary;
  contextHash: string;
}

export interface MailGenerationContextBuildResult {
  context: MailGenerationContext;
  evidence: ContextEvidence[];
}

export type AiMailResumeAvailability =
  'eligible' | 'needs_review' | 'processing' | 'failed' | 'not_parsed';

export interface AiMailResumeListItem {
  id: string;
  fileName: string;
  label?: string;
  uploadedAt: string;
  updatedAt: string;
  processedAt?: string;
  processingStatus: string;
  parseStatus?: string;
  availability: AiMailResumeAvailability;
  eligibleForAiMail: boolean;
  ineligibleReason?: string;
  isPrimary: boolean;
  warning?: string;
}

export interface AiMailResumeListDto {
  items: AiMailResumeListItem[];
  primaryResumeId?: string;
}

export interface AiMailProfileSummaryDto {
  exists: boolean;
  confirmed: boolean;
  candidateName?: string;
  currentTitle?: string;
  yearsOfExperience?: number;
  topSkills: string[];
  fullNamePresent: boolean;
  currentRolePresent: boolean;
  locationPresent: boolean;
  skillCount: number;
  experienceCount: number;
  educationCount: number;
  certificationCount: number;
  achievementCount: number;
  professionalLinkCount: number;
  completenessPercent: number;
  missingRecommendedSections: string[];
}

export type AiMailReadinessCode =
  | 'AI_MAIL_PROFILE_NOT_FOUND'
  | 'AI_MAIL_PROFILE_CONTEXT_UNAVAILABLE'
  | 'AI_MAIL_PROFILE_INCOMPLETE'
  | 'AI_MAIL_RESUME_NOT_FOUND'
  | 'AI_MAIL_RESUME_NOT_OWNED'
  | 'AI_MAIL_RESUME_PROCESSING'
  | 'AI_MAIL_RESUME_FAILED'
  | 'AI_MAIL_RESUME_NOT_PARSED'
  | 'AI_MAIL_RESUME_NEEDS_REVIEW'
  | 'AI_MAIL_JOB_DESCRIPTION_MISSING'
  | 'AI_MAIL_JOB_DESCRIPTION_INVALID'
  | 'AI_MAIL_JOB_DESCRIPTION_TOO_LARGE'
  | 'AI_MAIL_RECRUITER_EMAIL_INVALID'
  | 'AI_MAIL_RECRUITER_NAME_MISSING'
  | 'AI_MAIL_COMPANY_INFERRED'
  | 'AI_MAIL_COMPANY_UNDETECTED'
  | 'AI_MAIL_NO_ACHIEVEMENTS'
  | 'AI_MAIL_NO_PROFESSIONAL_SUMMARY'
  | 'AI_MAIL_NO_SKILLS_OVERLAP'
  | 'AI_MAIL_SUSPICIOUS_JOB_INSTRUCTIONS'
  | 'AI_MAIL_CONTEXT_TOO_LARGE'
  | 'AI_MAIL_CONTEXT_BUILD_FAILED';

export interface AiMailReadinessIssue {
  code: AiMailReadinessCode;
  message: string;
  field?: string;
}

export interface AiMailGenerationReadinessDto {
  ready: boolean;
  blockers: AiMailReadinessIssue[];
  warnings: AiMailReadinessIssue[];
  resume?: AiMailResumeListItem;
  profile: AiMailProfileSummaryDto;
  detectedJobMetadata: {
    roleTitle?: string;
    companyName?: string;
    recruiterName?: string;
  };
  suggestedJobMetadata: {
    roleTitle?: string;
    companyName?: string;
  };
  counts: {
    profileSkills: number;
    resumeSkills: number;
    experienceEntries: number;
    jobRequirements: number;
    jobResponsibilities: number;
    jobKeywords: number;
  };
  contextHash?: string;
}

export type MailGenerationOperation =
  | 'generate_full'
  | 'regenerate_full'
  | 'generate_subject'
  | 'generate_follow_up'
  | 'rewrite_tone'
  | 'shorten'
  | 'expand'
  | 'fix_grammar'
  | 'rewrite_selection';

export type AiMailGenerationErrorCode =
  | 'AI_MAIL_NOT_READY'
  | 'AI_MAIL_GENERATION_STALE'
  | 'AI_MAIL_GENERATION_RATE_LIMIT'
  | 'AI_MAIL_REGENERATION_RATE_LIMIT'
  | 'AI_MAIL_USER_EDITS_OVERWRITE_CONFIRMATION_REQUIRED'
  | 'AI_MAIL_OUTPUT_INVALID'
  | 'AI_MAIL_UNSUPPORTED_CLAIM'
  | 'AI_MAIL_CLAIM_REVIEW_REQUIRED'
  | 'AI_MAIL_CONSTRAINT_VIOLATION'
  | 'AI_MAIL_PROVIDER_UNAVAILABLE'
  | 'AI_MAIL_PROVIDER_TIMEOUT'
  | 'AI_MAIL_GENERATION_FAILED'
  | 'AI_MAIL_IDEMPOTENCY_CONFLICT'
  | 'AI_MAIL_REVISION_NOT_FOUND'
  | 'AI_MAIL_REVISION_LIMIT_REACHED'
  | 'AI_MAIL_PARTIAL_REWRITE_DISABLED';

export type GenerationWarningCode =
  | 'MISSING_CONTEXT'
  | 'UNSUPPORTED_CLAIM'
  | 'UNRESOLVED_PLACEHOLDER'
  | 'SUSPICIOUS_LINK'
  | 'REVIEW_REQUIRED'
  | 'WORD_COUNT_TOLERANCE'
  | 'MISSING_CALL_TO_ACTION'
  | 'MISSING_RESUME_MENTION'
  | 'AVOID_TOPIC_DETECTED';

export interface GenerationWarning {
  code: string;
  message: string;
  field?: 'subject' | 'bodyText' | 'bodyHtml';
}

export type HighlightedQualificationEvidenceCategory =
  'skill' | 'experience' | 'achievement' | 'education' | 'certification' | 'project';

export interface HighlightedQualification {
  claim: string;
  evidenceCategory: HighlightedQualificationEvidenceCategory;
}

export interface GeneratedMailOutput {
  subject: string;
  bodyText: string;
  bodyHtml?: string;
  detectedContext: {
    roleTitle?: string;
    companyName?: string;
    recruiterName?: string;
  };
  highlightedQualifications: HighlightedQualification[];
  warnings: GenerationWarning[];
}

export type AiMailRevisionSource = 'ai_generated' | 'ai_regenerated' | 'user_saved' | 'restored';

export interface AiMailDraftRevision {
  id: string;
  draftId: string;
  draftVersion: number;
  revisionNumber: number;
  source: AiMailRevisionSource;
  operation?: MailGenerationOperation;
  subject?: string;
  bodyText?: string;
  contextHash?: string;
  promptVersion?: string;
  providerName?: string;
  providerModel?: string;
  createdAt: string;
}

export interface AiMailDraft {
  id: string;
  userId: string;
  recruiterEmail: string;
  recruiterName?: string;
  companyName?: string;
  roleTitle?: string;
  jobUrl?: string;
  jobDescription: string;
  additionalContext?: string;
  resumeId: string;
  profileSnapshotId?: string;
  constraints: MailGenerationConstraints;
  subject?: string;
  bodyText?: string;
  bodyHtml?: string;
  status: MailDraftStatus;
  version: number;
  generatedBy?: {
    provider: string;
    model: string;
    requestId?: string;
    generatedAt: string;
  };
  userEdited: boolean;
  contentHash?: string;
  lastContextHash?: string;
  followUpToDeliveryId?: string;
  archivedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export type MailGenerationAttemptStatus = 'started' | 'succeeded' | 'failed' | 'cancelled';

/** Privacy-safe provider telemetry. Prompt and generated content are never persisted here. */
export interface AiMailGenerationAttempt {
  id: string;
  draftId: string;
  userId: string;
  operation: string;
  status: MailGenerationAttemptStatus;
  providerName: string;
  providerModel?: string;
  providerRequestId?: string;
  durationMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  normalizedErrorCode?: string;
  retryCount: number;
  contextHash?: string;
  promptVersion?: string;
  outputSchemaVersion?: string;
  idempotencyKey?: string;
  createdAt: string;
}

export const DEFAULT_MAIL_GENERATION_CONSTRAINTS: Readonly<MailGenerationConstraints> = {
  tone: 'professional',
  maximumWords: 250,
  includeCallToAction: true,
  includeResumeMention: true,
  emphasizeSkills: [],
  emphasizeAchievements: [],
  avoidTopics: ['salary expectations'],
};
