import { IJobProvider } from '@/modules/jobs/interfaces/IJobProvider.js';
import { ProviderTier } from '@/modules/jobs/types/job.types.js';
import { DuplicateProviderRegistrationError } from '@/modules/jobs/errors/DuplicateProviderRegistrationError.js';
import { jobsLogger } from '@/shared/utils/logger.js';

export interface IJobProviderRegistry {
  register(provider: IJobProvider): void;
  getByName(name: string): IJobProvider | undefined;
  getAll(): IJobProvider[];
  getByTier(tier: ProviderTier): IJobProvider[];
  getEnabledProviders(filter?: { tiers?: ProviderTier[]; names?: string[] }): IJobProvider[];
  getEnabledProvidersSortedByPriority(filter?: {
    tiers?: ProviderTier[];
    names?: string[];
  }): IJobProvider[];
}

export class JobProviderRegistry implements IJobProviderRegistry {
  private readonly providers = new Map<string, IJobProvider>();

  register(provider: IJobProvider): void {
    const normalizedName = provider.name.trim().toLowerCase();
    if (this.providers.has(normalizedName)) {
      throw new DuplicateProviderRegistrationError(provider.name);
    }
    this.providers.set(normalizedName, provider);
    jobsLogger.debug(
      {
        provider: provider.name,
        tier: provider.tier,
        enabled: provider.isEnabled,
      },
      'Provider registered',
    );
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

  getEnabledProviders(filter?: { tiers?: ProviderTier[]; names?: string[] }): IJobProvider[] {
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
        const normalizedFilterNames = filter.names.map((n) => n.trim().toLowerCase());
        if (!normalizedFilterNames.includes(p.name.trim().toLowerCase())) {
          return false;
        }
      }
      return true;
    });
  }

  getEnabledProvidersSortedByPriority(filter?: {
    tiers?: ProviderTier[];
    names?: string[];
  }): IJobProvider[] {
    const enabled = this.getEnabledProviders(filter);
    const sorted = enabled.sort((a, b) => {
      const priorityA = a.manifest?.priority ?? 0;
      const priorityB = b.manifest?.priority ?? 0;
      if (priorityB !== priorityA) {
        return priorityB - priorityA; // Descending order
      }
      return a.name.localeCompare(b.name); // Deterministic tie-breaker
    });
    jobsLogger.debug(
      {
        filter,
        providers: sorted.map((provider) => ({
          name: provider.name,
          tier: provider.tier,
          priority: provider.manifest?.priority ?? 0,
        })),
      },
      'Enabled providers sorted by priority',
    );
    return sorted;
  }
}
