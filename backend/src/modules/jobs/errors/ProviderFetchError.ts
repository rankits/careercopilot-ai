import { JobModuleError } from "@/modules/jobs/errors/JobModuleError.js";

export class ProviderFetchError extends JobModuleError {
  readonly providerName: string;
  readonly originalError?: unknown;

  constructor(providerName: string, message: string, originalError?: unknown) {
    super(`[Provider: ${providerName}] ${message}`, 502);
    this.providerName = providerName;
    this.originalError = originalError;
  }
}
