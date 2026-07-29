export type ParserEngine = "RULE_BASED" | "AI";
export type ResumeStorageDriverName = "LOCAL" | "S3";

export interface ParsedResumeData {
  personalDetails: Record<string, unknown>;
  experience: Array<Record<string, unknown>>;
  education: Array<Record<string, unknown>>;
  skills: string[];
  certifications: Array<Record<string, unknown>>;
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
