import { JobModuleError } from "./JobModuleError.js";

export class DuplicateProviderRegistrationError extends JobModuleError {
  constructor(providerName: string) {
    super(
      `Job provider with name '${providerName}' is already registered`,
      409
    );
    this.name = "DuplicateProviderRegistrationError";
  }
}
