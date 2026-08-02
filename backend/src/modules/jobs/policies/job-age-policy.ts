import { env } from '@/shared/config/env.conf.js';
import { subtractDays } from '@/modules/jobs/utils/calendar-days.js';

export interface JobAgePolicyInput {
  effectiveDate: Date | null;
  isActive?: boolean;
}

export interface JobStorageEligibility {
  eligible: boolean;
  effectiveDate: Date | null;
  cutoffDate: Date | null;
  reason:
    | 'STORAGE_AGE_FILTER_DISABLED'
    | 'WITHIN_STORAGE_AGE_WINDOW'
    | 'OUTSIDE_STORAGE_AGE_WINDOW'
    | 'EFFECTIVE_DATE_MISSING'
    | 'EFFECTIVE_DATE_MISSING_REJECTED';
}

export interface JobEmbeddingEligibility {
  eligible: boolean;
  effectiveDate: Date | null;
  cutoffDate: Date | null;
  reason:
    | 'EMBEDDING_AGE_FILTER_DISABLED'
    | 'WITHIN_EMBEDDING_AGE_WINDOW'
    | 'OUTSIDE_EMBEDDING_AGE_WINDOW'
    | 'NOT_STORAGE_ELIGIBLE'
    | 'JOB_NOT_ACTIVE'
    | 'EFFECTIVE_DATE_MISSING'
    | 'EFFECTIVE_DATE_MISSING_REJECTED';
}

export class JobAgePolicy {
  constructor(private readonly now: () => Date = () => new Date()) {}

  getStorageCutoffDate(referenceDate: Date = this.now()): Date | null {
    if (!env.JOB_STORAGE_AGE_FILTER_ENABLED) return null;
    return subtractDays(referenceDate, env.JOB_STORAGE_MAX_AGE_DAYS);
  }

  getEmbeddingCutoffDate(referenceDate: Date = this.now()): Date | null {
    if (!env.JOB_EMBEDDING_AGE_FILTER_ENABLED) return null;
    return subtractDays(referenceDate, env.JOB_EMBEDDING_MAX_AGE_DAYS);
  }

  evaluateStorageEligibility(input: JobAgePolicyInput): JobStorageEligibility {
    const referenceDate = this.now();
    const cutoffDate = this.getStorageCutoffDate(referenceDate);

    if (!input.effectiveDate) {
      if (env.JOB_UNKNOWN_DATE_POLICY === 'REJECT') {
        return {
          eligible: false,
          effectiveDate: null,
          cutoffDate,
          reason: 'EFFECTIVE_DATE_MISSING_REJECTED',
        };
      }
      return {
        eligible: true,
        effectiveDate: null,
        cutoffDate,
        reason: 'EFFECTIVE_DATE_MISSING',
      };
    }

    if (!env.JOB_STORAGE_AGE_FILTER_ENABLED) {
      return {
        eligible: true,
        effectiveDate: input.effectiveDate,
        cutoffDate: null,
        reason: 'STORAGE_AGE_FILTER_DISABLED',
      };
    }

    const eligible = input.effectiveDate >= cutoffDate!;
    return {
      eligible,
      effectiveDate: input.effectiveDate,
      cutoffDate,
      reason: eligible ? 'WITHIN_STORAGE_AGE_WINDOW' : 'OUTSIDE_STORAGE_AGE_WINDOW',
    };
  }

  evaluateEmbeddingEligibility(input: JobAgePolicyInput): JobEmbeddingEligibility {
    const storageEligibility = this.evaluateStorageEligibility(input);
    if (!storageEligibility.eligible) {
      return {
        eligible: false,
        effectiveDate: input.effectiveDate,
        cutoffDate: this.getEmbeddingCutoffDate(this.now()),
        reason: 'NOT_STORAGE_ELIGIBLE',
      };
    }

    if (input.isActive === false) {
      return {
        eligible: false,
        effectiveDate: input.effectiveDate,
        cutoffDate: this.getEmbeddingCutoffDate(this.now()),
        reason: 'JOB_NOT_ACTIVE',
      };
    }

    const referenceDate = this.now();
    const cutoffDate = this.getEmbeddingCutoffDate(referenceDate);

    if (!input.effectiveDate) {
      if (
        env.JOB_UNKNOWN_DATE_POLICY === 'REJECT' ||
        env.JOB_UNKNOWN_DATE_POLICY === 'ALLOW_STORAGE_ONLY'
      ) {
        return {
          eligible: false,
          effectiveDate: null,
          cutoffDate,
          reason: 'EFFECTIVE_DATE_MISSING_REJECTED',
        };
      }
      return {
        eligible: true,
        effectiveDate: null,
        cutoffDate,
        reason: 'EFFECTIVE_DATE_MISSING',
      };
    }

    if (!env.JOB_EMBEDDING_AGE_FILTER_ENABLED) {
      return {
        eligible: true,
        effectiveDate: input.effectiveDate,
        cutoffDate: null,
        reason: 'EMBEDDING_AGE_FILTER_DISABLED',
      };
    }

    const eligible = input.effectiveDate >= cutoffDate!;
    return {
      eligible,
      effectiveDate: input.effectiveDate,
      cutoffDate,
      reason: eligible ? 'WITHIN_EMBEDDING_AGE_WINDOW' : 'OUTSIDE_EMBEDDING_AGE_WINDOW',
    };
  }
}

export const jobAgePolicy = new JobAgePolicy();
