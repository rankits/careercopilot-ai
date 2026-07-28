export interface LeverJobPosting {
  readonly id: string;
  readonly text: string;
  readonly createdAt: number;
  readonly descriptionPlain: string;
  readonly categories: {
    readonly team?: string;
    readonly location?: string;
    readonly commitment?: string;
  };
  readonly hostedUrl: string;
  readonly applyUrl: string;
  readonly salaryRange?: {
    readonly min?: number;
    readonly max?: number;
    readonly currency?: string;
    readonly interval?:
      | "per-year-salary"
      | "per-month-salary"
      | "per-hour-salary";
  };
}
