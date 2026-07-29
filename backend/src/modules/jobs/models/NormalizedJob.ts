import { ProviderTier, JobSalaryPeriod } from "@/modules/jobs/types/job.types.js";

export interface NormalizedJobLocation {
  readonly raw: string;
  readonly city?: string;
  readonly country?: string;
  readonly isRemote: boolean;
}

export interface NormalizedJobSalary {
  readonly min?: number;
  readonly max?: number;
  readonly currency: string;
  readonly period: JobSalaryPeriod;
}

export interface NormalizedJob {
  readonly id: string;               // UUID internal to our system
  readonly providerJobId: string;    // ID from external provider
  readonly providerName: string;     // Provider identifier (e.g., "lever", "greenhouse")
  readonly providerTier: ProviderTier; // Tier classification (PUBLIC, FREE_AUTH, PAID_AUTH)
  readonly title: string;
  readonly normalizedTitle: string;  // Lowercased, stripped title for fuzzy matching
  readonly companyName: string;
  readonly normalizedCompany: string; // Lowercased, stripped company for fuzzy matching
  readonly location: NormalizedJobLocation;
  readonly description: string;
  readonly applyUrl: string;
  readonly salary?: NormalizedJobSalary;
  readonly tags: string[];
  readonly postedAt: string;         // ISO-8601 UTC timestamp
  readonly canonicalHash: string;    // SHA-256 fingerprint for deduplication
}

