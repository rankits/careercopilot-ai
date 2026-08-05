import { httpClient } from './httpClient';

const BASE = '';

export interface UploadedResume {
  id: string;
  originalName: string;
  fileName: string;
  status: string;
  createdAt: string;
  sizeBytes?: number;
  uploadedAt?: string;
}

export interface SkillAnalysis {
  matchedSkills: string[];
  missingSkills: string[];
  transferableSkills: string[];
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

export interface EnterpriseOptimization {
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
}

export interface AnalysisDetails {
  enterpriseOptimization?: EnterpriseOptimization;
  invalidTarget?: boolean;
  invalidTargetMessage?: string;
}

export interface AnalysisResult {
  id: number;
  resumeId: string;
  targetRole: string;
  experienceLevel: string;
  jobDescription?: string | null;
  atsScore: number;
  keywordMatch: number;
  skillMatch: number;
  contentQuality: number;
  readability: number;
  formattingScore?: number;
  strengths: string[];
  weaknesses: string[];
  editedContent: string | null;
  currentStep: number;
  status: 'PENDING' | 'ANALYZING' | 'COMPLETED' | 'FAILED';
  keywords: KeywordItem[];
  suggestions: SuggestionItem[];
  skillAnalysis?: SkillAnalysis;
  sectionScores?: SectionScores;
  atsIssues?: AtsIssue[];
  baselineAtsScore?: number;
  optimizedSummary?: string;
  /** Present when status === FAILED — real AI/provider error text. */
  failureReason?: string;
  /** Backend AI rejected Target Role / JD — ATS forced to 0. */
  invalidTarget?: boolean;
  invalidTargetMessage?: string;
  analysisDetails?: AnalysisDetails | null;
}

export interface KeywordItem {
  id: number;
  term: string;
  status: 'MATCHED' | 'MISSING' | 'PARTIAL';
  importance: string;
  reason?: string;
}

export interface KeywordsResponse {
  missing: KeywordItem[];
  matched: KeywordItem[];
  partial: KeywordItem[];
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

export interface RecheckResult {
  atsScore: number;
  previousAtsScore?: number;
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

export interface ResumeVersion {
  id: number;
  label: string;
  content: string;
  atsScore: number;
  createdAt: string;
  targetRole?: string | null;
  jobDescription?: string | null;
  resumeFileName?: string | null;
  resumeId?: string;
}

export interface SavedResumeVersion extends ResumeVersion {
  targetRole: string;
  jobDescription: string | null;
  resumeFileName: string;
  resumeId: string;
}

function unwrap<T>(response: { data: { data: T } }): T {
  return response.data.data;
}

export const resumeBuilderService = {
  // ─── Resume Upload ───────────────────────────────────────────────────────

  async uploadResume(file: File): Promise<UploadedResume> {
    const formData = new FormData();
    formData.append('resume', file);
    const res = await httpClient.post<{ data: UploadedResume }>(
      `${BASE}/resumes/upload`,
      formData,
      { headers: { 'Content-Type': 'multipart/form-data' } },
    );
    return unwrap(res);
  },

  async listResumes(): Promise<UploadedResume[]> {
    const res = await httpClient.get<{ data: UploadedResume[] }>(`${BASE}/resumes`);
    return unwrap(res) ?? [];
  },

  /**
   * Best-effort skill hints from prior parse / analysis so Define Role can
   * preview JD skill coverage before a full ATS run.
   */
  async getResumeSkillHints(resumeId: string): Promise<string[]> {
    const skills = new Set<string>();

    try {
      const analysis = await this.getAnalysis(resumeId);
      for (const skill of analysis?.skillAnalysis?.matchedSkills ?? []) {
        if (skill.trim()) skills.add(skill.trim());
      }
      for (const skill of analysis?.skillAnalysis?.missingSkills ?? []) {
        // missing from JD perspective — still may appear in resume text later
        void skill;
      }
      const content = analysis?.editedContent?.trim() ?? '';
      if (content) {
        const { extractKeywordsFromText } = await import(
          '@/pages/ResumeBuilderPage/utils/skills'
        );
        for (const skill of extractKeywordsFromText(content)) skills.add(skill);
      }
    } catch {
      // ignore — analysis may not exist yet
    }

    try {
      const res = await httpClient.get<{
        data: { extractedData?: Record<string, unknown> | null };
      }>(`${BASE}/resumes/${resumeId}/parsed-data`);
      const extracted = res.data?.data?.extractedData;
      if (extracted && typeof extracted === 'object') {
        const rawSkills = extracted.skills ?? extracted.Skills;
        if (Array.isArray(rawSkills)) {
          for (const item of rawSkills) {
            if (typeof item === 'string' && item.trim()) skills.add(item.trim());
            else if (item && typeof item === 'object' && 'name' in item) {
              const rawName = (item as { name?: unknown }).name;
              const name = typeof rawName === 'string' ? rawName.trim() : '';
              if (name) skills.add(name);
            }
          }
        } else if (typeof rawSkills === 'string' && rawSkills.trim()) {
          const { splitSkillTokens } = await import('@/pages/ResumeBuilderPage/utils/skills');
          for (const skill of splitSkillTokens(rawSkills)) skills.add(skill);
        }
      }
    } catch {
      // ignore — parse may not be ready
    }

    return Array.from(skills);
  },

  // ─── Analysis ───────────────────────────────────────────────────────────

  async startAnalysis(
    resumeId: string,
    payload: { targetRole: string; experienceLevel: string; jobDescription?: string },
  ): Promise<{ analysisId: number; status: string }> {
    const res = await httpClient.post<{ data: { analysisId: number; status: string } }>(
      `${BASE}/resume-analysis/${resumeId}/analyze`,
      payload,
    );
    return unwrap(res);
  },

  async getAnalysis(resumeId: string): Promise<AnalysisResult | null> {
    const res = await httpClient.get<{ data: AnalysisResult | null }>(
      `${BASE}/resume-analysis/${resumeId}/analysis`,
      {
        headers: {
          'Cache-Control': 'no-cache',
          Pragma: 'no-cache',
        },
        params: { _ts: Date.now() },
      },
    );
    return unwrap(res) ?? null;
  },

  async updateStep(resumeId: string, step: number): Promise<void> {
    await httpClient.patch(`${BASE}/resume-analysis/${resumeId}/step`, { step });
  },

  // ─── Keywords ───────────────────────────────────────────────────────────

  async getKeywords(resumeId: string): Promise<KeywordsResponse> {
    const res = await httpClient.get<{ data: KeywordsResponse }>(
      `${BASE}/resume-analysis/${resumeId}/keywords`,
    );
    return unwrap(res);
  },

  // ─── Suggestions ────────────────────────────────────────────────────────

  async getSuggestions(resumeId: string): Promise<SuggestionItem[]> {
    const res = await httpClient.get<{ data: SuggestionItem[] }>(
      `${BASE}/resume-analysis/${resumeId}/suggestions`,
    );
    return unwrap(res) ?? [];
  },

  async applySuggestion(
    resumeId: string,
    suggestionId: number,
    options?: { preserveContent?: boolean },
  ): Promise<SuggestionItem> {
    const res = await httpClient.post<{ data: SuggestionItem }>(
      `${BASE}/resume-analysis/${resumeId}/suggestions/${suggestionId}/apply`,
      { preserveContent: Boolean(options?.preserveContent) },
    );
    return unwrap(res);
  },

  async ignoreSuggestion(resumeId: string, suggestionId: number): Promise<SuggestionItem> {
    const res = await httpClient.post<{ data: SuggestionItem }>(
      `${BASE}/resume-analysis/${resumeId}/suggestions/${suggestionId}/ignore`,
      {},
    );
    return unwrap(res);
  },

  // ─── Content Editing ────────────────────────────────────────────────────

  async updateContent(resumeId: string, content: string): Promise<void> {
    await httpClient.patch(`${BASE}/resume-analysis/${resumeId}/content`, { content });
  },

  // ─── Recheck ────────────────────────────────────────────────────────────

  async recheckAts(resumeId: string): Promise<RecheckResult> {
    const res = await httpClient.post<{ data: RecheckResult }>(
      `${BASE}/resume-analysis/${resumeId}/recheck`,
      {},
    );
    return unwrap(res);
  },

  // ─── Versions ───────────────────────────────────────────────────────────

  async saveVersion(resumeId: string, label: string, content?: string): Promise<ResumeVersion> {
    const res = await httpClient.post<{ data: ResumeVersion }>(
      `${BASE}/resume-analysis/${resumeId}/versions`,
      { label, content },
    );
    return unwrap(res);
  },

  async getVersions(resumeId: string): Promise<ResumeVersion[]> {
    const res = await httpClient.get<{ data: ResumeVersion[] }>(
      `${BASE}/resume-analysis/${resumeId}/versions`,
    );
    return unwrap(res) ?? [];
  },

  async listSavedVersions(): Promise<SavedResumeVersion[]> {
    const res = await httpClient.get<{ data: SavedResumeVersion[] }>(
      `${BASE}/resume-analysis/saved-versions`,
    );
    return unwrap(res) ?? [];
  },

  async getSavedVersion(versionId: number): Promise<SavedResumeVersion> {
    const res = await httpClient.get<{ data: SavedResumeVersion }>(
      `${BASE}/resume-analysis/saved-versions/${versionId}`,
    );
    return unwrap(res);
  },

  async deleteSavedVersion(versionId: number): Promise<{ id: number }> {
    const res = await httpClient.delete<{ data: { id: number } }>(
      `${BASE}/resume-analysis/saved-versions/${versionId}`,
    );
    return unwrap(res);
  },

  // ─── Export ─────────────────────────────────────────────────────────────

  async exportResume(resumeId: string, format: 'pdf' | 'docx' | 'txt'): Promise<ExportResult> {
    const res = await httpClient.get<{ data: ExportResult }>(
      `${BASE}/resume-analysis/${resumeId}/export?format=${format}`,
    );
    return unwrap(res);
  },
};
