export interface AnalysisInput {
  resumeId: string;
  /** Owning principal — required for IDOR-safe reads/writes. */
  userId: string;
  targetRole: string;
  experienceLevel: string;
  jobDescription?: string;
}

export interface KeywordItem {
  id: number;
  term: string;
  status: 'MATCHED' | 'MISSING' | 'PARTIAL';
  importance: string;
  reason?: string;
}

export interface SuggestionItem {
  id: number;
  title: string;
  category: string;
  originalText: string;
  suggestedText: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  status: 'PENDING' | 'APPLIED' | 'IGNORED';
  reason?: string;
}

export interface SkillAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
  /** Resume skills not required by the JD. */
  additionalSkills?: string[];
  recommendedSkills: string[];
}

export interface SectionScores {
  summary: number;
  experience: number;
  skills: number;
  education: number;
  projects: number;
  achievements: number;
}

export interface AtsIssue {
  issue: string;
  section: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  fix: string;
}

export interface AnalysisDetails {
  formattingScore: number;
  skillAnalysis: SkillAnalysis;
  sectionScores: SectionScores;
  atsIssues: AtsIssue[];
  optimizedSections: {
    professionalSummary: string;
    skills: string[];
    experienceBullets: Array<{ originalText: string; optimizedText: string }>;
    projectBullets: Array<{ originalText: string; optimizedText: string }>;
  };
  optimizedResumeText: string;
  enterpriseOptimization?: {
    experienceRelevance: number;
    resumeStrength: number;
    industryAlignment: number;
    recruiterReadability: number;
    interviewReadiness: number;
    improvedSummary: string;
    improvedExperience: string[];
    improvedProjects: string[];
    improvedSkills: string[];
    recommendedSkillOrder: string[];
    atsSuggestions: string[];
    grammarSuggestions: string[];
    finalResume: Record<string, unknown>;
  };
  missingKeywordReasons: Record<string, string>;
  /** Original ATS from first analysis — used for export increase display. */
  baselineAtsScore?: number;
  /** True when AI rejected targetRole / jobDescription before scoring. */
  invalidTarget?: boolean;
  invalidTargetMessage?: string;
}

export interface AnalysisResult {
  id: number;
  resumeId: string;
  targetRole: string;
  experienceLevel: string;
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  contentQuality: number;
  readability: number;
  formattingScore: number;
  strengths: string[];
  weaknesses: string[];
  editedContent: string | null;
  currentStep: number;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  keywords: KeywordItem[];
  suggestions: SuggestionItem[];
  skillAnalysis: SkillAnalysis;
  sectionScores: SectionScores;
  atsIssues: AtsIssue[];
  analysisDetails: AnalysisDetails | null;
  baselineAtsScore?: number;
  optimizedSummary?: string;
  /** AI gate rejected Target Role / JD — show Oops, ATS is 0. */
  invalidTarget?: boolean;
  invalidTargetMessage?: string;
}

export interface AiAnalysisOutput {
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  contentQuality: number;
  readability: number;
  formattingScore: number;
  strengths: string[];
  weaknesses: string[];
  missingKeywords: Array<{ term: string; importance: 'high' | 'medium' | 'low'; reason?: string }>;
  matchedKeywords: Array<{ term: string; importance: 'high' | 'medium' | 'low' }>;
  skillAnalysis: SkillAnalysis;
  sectionScores: SectionScores;
  atsIssues: AtsIssue[];
  suggestions: Array<{
    id?: string;
    title: string;
    category: string;
    originalText: string;
    suggestedText: string;
    impact: 'HIGH' | 'MEDIUM' | 'LOW';
    reason?: string;
  }>;
  optimizedSections: AnalysisDetails['optimizedSections'];
  optimizedResumeText: string;
  experienceRelevance?: number;
  resumeStrength?: number;
  industryAlignment?: number;
  recruiterReadability?: number;
  interviewReadiness?: number;
  missingSkills?: string[];
  additionalSkillsFound?: string[];
  improvedSummary?: string;
  improvedExperience?: string[];
  improvedProjects?: string[];
  improvedSkills?: string[];
  recommendedSkillOrder?: string[];
  atsSuggestions?: string[];
  grammarSuggestions?: string[];
  finalResume?: Record<string, unknown>;
}

export interface RecheckResult {
  atsScore: number;
  previousAtsScore: number;
  improvement: number;
  grade: string;
  keywordMatch?: number;
  skillMatch?: number;
  contentQuality?: number;
  readability?: number;
  formattingScore?: number;
  sectionScores?: SectionScores;
  skillAnalysis?: SkillAnalysis;
}

export interface ExportResult {
  content: string;
  mimeType: string;
  fileName: string;
}
