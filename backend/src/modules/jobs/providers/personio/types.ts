export interface PersonioPosition {
  readonly id: string;
  readonly name: string;
  readonly office?: string;
  readonly department?: string;
  readonly recruitingCategory?: string;
  readonly employmentType?: string;
  readonly seniority?: string;
  readonly schedule?: string;
  readonly createdAt?: string;
  readonly descriptionHtml?: string;
}

export interface PersonioAccountConfig {
  readonly account: string;
  readonly companyName?: string;
}
