export type ParserEngine = 'RULE_BASED' | 'AI';
export type ResumeStorageDriverName = 'LOCAL' | 'S3';

export type ProfessionalLabelCategory = 'ROLE' | 'SPECIALISATION' | 'TECH_STACK' | 'DOMAIN';
export type ProfessionalLabelSource = 'EXPLICIT' | 'INFERRED';
export type ProfessionalSeniorityLevel =
  | 'INTERN'
  | 'ENTRY'
  | 'JUNIOR'
  | 'MID'
  | 'SENIOR'
  | 'LEAD'
  | 'MANAGER'
  | 'DIRECTOR'
  | 'EXECUTIVE'
  | 'UNKNOWN';
export type LanguageProficiency = 'NATIVE' | 'BASIC' | 'CONVERSATIONAL' | 'PROFESSIONAL' | 'FLUENT';

export interface ParsedResumeData {
  personalDetails: Record<string, unknown>;
  professionalProfile?: Record<string, unknown>;
  professionalLabels?: Array<Record<string, unknown>>;
  experience: Array<Record<string, unknown>>;
  projects?: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  skills: string[];
  certifications: Array<Record<string, unknown>>;
  languages?: Array<Record<string, unknown>>;
  links?: Record<string, unknown>;
  totalExperienceMonths?: number;
  totalExperienceYears?: number;
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

export interface CanonicalProfessionalLinks {
  linkedIn: string | null;
  github: string | null;
  portfolio: string | null;
  website: string | null;
  stackoverflow: string | null;
  leetcode: string | null;
  hackerrank: string | null;
  behance: string | null;
  dribbble: string | null;
  other: Array<{
    platform: string | null;
    label: string | null;
    url: string;
  }>;
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
  name: string;
  role: string | null;
  company: string | null;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
  responsibilities: string[];
  achievements: string[];
  technologies: string[];
  links: string[];
}

export interface CanonicalResumeLanguage {
  name: string;
  proficiency: LanguageProficiency | null;
  isNative: boolean;
}

export interface CanonicalResumeParseQuality {
  overallConfidence: number;
  requiresReview: boolean;
  missingImportantFields: string[];
  warnings: string[];
}

export interface CanonicalResume {
  schemaVersion: 'resume-schema-v2';
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
  professionalProfile: {
    headline: string | null;
    summary: string | null;
    currentTitle: string | null;
    primaryRole: string | null;
    seniorityLevel: ProfessionalSeniorityLevel | null;
    totalExperienceMonths: number;
    totalExperienceYears: number;
  } | null;
  professionalLabels: Array<{
    label: string;
    category: ProfessionalLabelCategory;
    confidence: number;
    source: ProfessionalLabelSource;
    evidence: string[];
  }>;
  employmentHistory: CanonicalResumeEmployment[];
  projects: CanonicalResumeProject[];
  education: CanonicalResumeEducation[];
  skills: {
    technical: string[];
    tools: string[];
    frameworks: string[];
    softSkills: string[];
    domains: string[];
  };
  certifications: CanonicalResumeCertification[];
  languages: CanonicalResumeLanguage[];
  links: CanonicalProfessionalLinks;
  awards: string[];
  publications: string[];
  totalExperienceMonths: number;
  totalExperienceYears: number;
  parseQuality: CanonicalResumeParseQuality;
}

export interface ResumeParserInput {
  extractedText: string;
  document?: {
    buffer?: Buffer;
    mimeType?: string;
    fileName?: string;
  };
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

export interface UpdateCandidateProfileInput {
  personalDetails?: Record<string, unknown>;
  experience?: Array<Record<string, unknown>>;
  education?: Array<Record<string, unknown>>;
  skills?: string[];
  certifications?: Array<Record<string, unknown>>;
}

export interface CandidateProfileResponse {
  userId: string;
  personalDetails: Record<string, unknown>;
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  skills: string[];
  certifications: Array<Record<string, unknown>>;
  sourceResumeId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}
