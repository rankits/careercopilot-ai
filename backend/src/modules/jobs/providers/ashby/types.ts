export interface AshbyCompensation {
  readonly compensationTierSummary?: string | null;
  readonly scrapeableCompensationSalarySummary?: string | null;
}

export interface AshbyJobPosting {
  readonly id: string;
  readonly title: string;
  readonly department?: string | null;
  readonly team?: string | null;
  readonly employmentType?: string | null;
  readonly location?: string | null;
  readonly secondaryLocations?: string[] | null;
  readonly publishedAt?: string | null;
  readonly isListed?: boolean;
  readonly isRemote?: boolean;
  readonly workplaceType?: string | null;
  readonly jobUrl?: string | null;
  readonly applyUrl?: string | null;
  readonly descriptionHtml?: string | null;
  readonly descriptionPlain?: string | null;
  readonly compensation?: AshbyCompensation | null;
}

export interface AshbyJobsResponse {
  readonly jobs?: AshbyJobPosting[];
}
