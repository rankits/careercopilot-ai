/**
 * Application-specific Candidate Profile → Job Match (Step 1).
 * Does not use resume content — only verified profile + Answer Vault + job data + analysis.
 */

export type ProfileMatchConfidence = 'HIGH' | 'MEDIUM' | 'LOW';

export type ProfileEligibilityStatus = 'ELIGIBLE' | 'NOT_ELIGIBLE' | 'INFORMATION_REQUIRED';

export type RoleMatchStatus = 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'UNKNOWN';

export type ExperienceMatchStatus = 'MATCH' | 'GAP' | 'UNKNOWN';

export type DimensionMatchStatus = 'MATCH' | 'PARTIAL' | 'NO_MATCH' | 'UNKNOWN' | 'NOT_APPLICABLE';

export interface ProfileMatchEvidenceItem {
  readonly code: string;
  readonly message: string;
  readonly field?: string;
  readonly source?: 'PROFILE' | 'ANSWER_VAULT' | 'JOB' | 'ANALYSIS';
}

export interface ProfileMatchEligibility {
  readonly status: ProfileEligibilityStatus;
  readonly blockers: ProfileMatchEvidenceItem[];
}

export interface ProfileMatchRole {
  readonly status: RoleMatchStatus;
  readonly evidence: ProfileMatchEvidenceItem[];
  readonly jobTitle: string | null;
  readonly desiredRoles: string[];
}

export interface ProfileMatchSkills {
  readonly matched: string[];
  readonly missing: string[];
  readonly unknown: string[];
}

export interface ProfileMatchExperience {
  readonly requiredYears: number | null;
  readonly candidateYears: number | null;
  readonly status: ExperienceMatchStatus;
  readonly evidence: ProfileMatchEvidenceItem[];
}

export interface ProfileMatchLocation {
  readonly status: DimensionMatchStatus;
  readonly evidence: ProfileMatchEvidenceItem[];
  readonly jobRequirement: unknown;
  readonly candidateRegion: string | null;
}

export interface ProfileMatchWorkAuthorization {
  readonly status: DimensionMatchStatus;
  readonly evidence: ProfileMatchEvidenceItem[];
  readonly candidateAnswer: string | null;
}

export interface ProfileMatchSponsorship {
  readonly status: DimensionMatchStatus;
  readonly evidence: ProfileMatchEvidenceItem[];
  readonly candidateRequiresSponsorship: boolean | null;
  readonly jobProvidesSponsorship: boolean | null;
}

/** Which inputs were available when this match was computed. */
export interface ProfileMatchDataSources {
  readonly verifiedProfile: boolean;
  readonly answerVault: boolean;
  readonly storedJobData: boolean;
  readonly jobPageAnalysis: boolean;
}

export interface ProfileJobMatchResult {
  readonly overallAlignment: number | null;
  readonly eligibility: ProfileMatchEligibility;
  readonly roleMatch: ProfileMatchRole;
  readonly skillsMatch: ProfileMatchSkills;
  readonly experienceMatch: ProfileMatchExperience;
  readonly locationMatch: ProfileMatchLocation;
  readonly workAuthorizationMatch: ProfileMatchWorkAuthorization;
  readonly sponsorshipMatch: ProfileMatchSponsorship;
  readonly confidence: ProfileMatchConfidence;
  readonly warnings: ProfileMatchEvidenceItem[];
  /** Missing mandatory candidate facts (drives INFORMATION_REQUIRED). */
  readonly missingInformation: ProfileMatchEvidenceItem[];
  /** Human-readable strengths derived from confirmed MATCH/PARTIAL signals. */
  readonly topStrengths: string[];
  /** Human-readable gaps from blockers, missing info, and soft skill unknowns. */
  readonly keyGaps: string[];
  /** Truthful flags for which data inputs were available for this match. */
  readonly dataSources: ProfileMatchDataSources;
  /** Cached recommendation score kept as historical/fallback context only. */
  readonly recommendationScoreFallback: number | null;
  readonly analysisId: string | null;
  readonly jobId: string;
  readonly matchedAt: string;
  readonly schemaVersion: 1;
}

export interface ProfileJobMatchRecord {
  readonly id: string;
  readonly userId: string;
  readonly jobApplicationId: string;
  readonly jobId: string;
  readonly analysisId: string | null;
  readonly contentHash: string;
  readonly result: ProfileJobMatchResult;
  readonly matchedAt: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}
