export interface LeverCategories {
  readonly commitment?: string | null;
  readonly department?: string | null;
  readonly location?: string | null;
  readonly team?: string | null;
  readonly allLocations?: string[] | null;
}

export interface LeverJobPosting {
  readonly id: string;
  readonly text: string;
  readonly categories?: LeverCategories | null;
  readonly country?: string | null;
  readonly workplaceType?: string | null;
  readonly description?: string | null;
  readonly descriptionPlain?: string | null;
  readonly descriptionBody?: string | null;
  readonly hostedUrl?: string | null;
  readonly applyUrl?: string | null;
  readonly createdAt?: number | string | null;
  readonly additional?: string | null;
}

export type LeverPostingsResponse = LeverJobPosting[];
