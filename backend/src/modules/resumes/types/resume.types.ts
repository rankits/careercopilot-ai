export type ParserEngine = "RULE_BASED" | "AI";
export type ResumeStorageDriverName = "LOCAL" | "S3";

export interface ParsedResumeData {
  personalDetails: Record<string, unknown>;
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  skills: string[];
  certifications: Array<Record<string, unknown>>;
}

export interface CanonicalResumeLocation {
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

export interface CanonicalResumeLinkSet {
  linkedin: string | null;
  github: string | null;
  portfolio: string | null;
  other: string[];
}

export interface CanonicalResumeEmployment {
  company: string | null;
  title: string | null;
  location: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
}

export interface CanonicalResumeEducation {
  institution: string | null;
  qualification: string | null;
  fieldOfStudy: string | null;
  startDate: string | null;
  endDate: string | null;
  grade: string | null;
  location: string | null;
}

export interface CanonicalResumeCertification {
  name: string | null;
  issuer: string | null;
  issueDate: string | null;
  expiryDate: string | null;
  credentialId: string | null;
  credentialUrl: string | null;
}

export interface CanonicalResumeProject {
  name: string | null;
  description: string | null;
  role: string | null;
  technologies: string[];
  url: string | null;
}

export interface CanonicalResumeLanguage {
  name: string;
  proficiency: string | null;
}

export interface CanonicalResumeParseQuality {
  overallConfidence: number;
  requiresReview: boolean;
  missingImportantFields: string[];
  warnings: string[];
}

export interface CanonicalResume {
  schemaVersion: "resume-schema-v1";
  personalInformation: {
    fullName: string | null;
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
    location: CanonicalResumeLocation;
    links: CanonicalResumeLinkSet;
  };
  professionalSummary: string | null;
  currentPosition: {
    title: string | null;
    company: string | null;
  };
  employmentHistory: CanonicalResumeEmployment[];
  education: CanonicalResumeEducation[];
  skills: {
    technical: string[];
    tools: string[];
    frameworks: string[];
    softSkills: string[];
    domains: string[];
  };
  certifications: CanonicalResumeCertification[];
  projects: CanonicalResumeProject[];
  languages: CanonicalResumeLanguage[];
  awards: string[];
  publications: string[];
  totalExperienceMonths: number | null;
  parseQuality: CanonicalResumeParseQuality;
}

export interface ResumeParserInput {
  document: {
    buffer: Buffer;
    mimeType: string;
    fileName: string;
  };
  extractedText: string;
}

export interface ResumeParserResult {
  data: ParsedResumeData;
  parserVersion: string;
  confidenceScore?: number;
}

export interface ResumeParser {
  parseResume(input: ResumeParserInput): Promise<ResumeParserResult>;
}

export interface OnboardingProfilePayload extends ParsedResumeData {
  userId: string;
  sourceResumeId?: string;
}
