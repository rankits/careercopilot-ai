import { IJobProvider } from "../interfaces/IJobProvider.js";
import { ProviderTier } from "../types/job.types.js";
import { JobModuleError } from "../errors/JobModuleError.js";

export interface IJobProviderRegistry {
  register(provider: IJobProvider): void;
  getByName(name: string): IJobProvider | undefined;
  getAll(): IJobProvider[];
  getByTier(tier: ProviderTier): IJobProvider[];
  getEnabledProviders(filter?: {
    tiers?: ProviderTier[];
    names?: string[];
  }): IJobProvider[];
}

export class JobProviderRegistry implements IJobProviderRegistry {
  private readonly providers = new Map<string, IJobProvider>();

  register(provider: IJobProvider): void {
    const normalizedName = provider.name.trim().toLowerCase();
    if (this.providers.has(normalizedName)) {
      throw new JobModuleError(
        `Job provider with name '${provider.name}' is already registered`,
        409
      );
    }
    this.providers.set(normalizedName, provider);
  }

  getByName(name: string): IJobProvider | undefined {
    return this.providers.get(name.trim().toLowerCase());
  }

  getAll(): IJobProvider[] {
    return Array.from(this.providers.values());
  }

  getByTier(tier: ProviderTier): IJobProvider[] {
    return this.getAll().filter((p) => p.tier === tier);
  }

  getEnabledProviders(filter?: {
    tiers?: ProviderTier[];
    names?: string[];
  }): IJobProvider[] {
    return this.getAll().filter((p) => {
      if (!p.isEnabled) {
        return false;
      }
      if (filter?.tiers && filter.tiers.length > 0) {
        if (!filter.tiers.includes(p.tier)) {
          return false;
        }
      }
      if (filter?.names && filter.names.length > 0) {
        const normalizedFilterNames = filter.names.map((n) =>
          n.trim().toLowerCase()
        );
        if (!normalizedFilterNames.includes(p.name.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }
}
