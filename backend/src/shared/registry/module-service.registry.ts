import { AppError } from '@/shared/utils/errors/AppError.js';

const registerService = Symbol('registerService');
const resolveService = Symbol('resolveService');
const hasService = Symbol('hasService');
const resetService = Symbol('resetService');

interface RegistryTokenLifecycle {
  [hasService](registry: object): boolean;
  [resetService](registry: object): void;
}

export class ModuleServiceToken<TService> implements RegistryTokenLifecycle {
  readonly description: string;
  private readonly registrations = new WeakMap<object, TService>();

  constructor(description: string) {
    this.description = description;
  }

  [registerService](registry: object, service: TService): void {
    this.registrations.set(registry, service);
  }

  [resolveService](registry: object): TService | undefined {
    return this.registrations.get(registry);
  }

  [hasService](registry: object): boolean {
    return this.registrations.has(registry);
  }

  [resetService](registry: object): void {
    this.registrations.delete(registry);
  }
}

export const createModuleServiceToken = <TService>(
  description: string,
): ModuleServiceToken<TService> => new ModuleServiceToken<TService>(description);

export class ModuleServiceRegistry {
  private readonly registeredTokens = new Set<RegistryTokenLifecycle>();

  register<TService>(token: ModuleServiceToken<TService>, service: TService): void {
    if (token[hasService](this)) {
      throw new AppError(
        `Module service already registered: ${token.description}`,
        500,
        'MODULE_SERVICE_DUPLICATE',
      );
    }

    token[registerService](this, service);
    this.registeredTokens.add(token);
  }

  resolve<TService>(token: ModuleServiceToken<TService>): TService {
    const service = token[resolveService](this);
    if (service === undefined) {
      throw new AppError(
        `Module service is not registered: ${token.description}`,
        500,
        'MODULE_SERVICE_MISSING',
      );
    }
    return service;
  }

  has<TService>(token: ModuleServiceToken<TService>): boolean {
    return token[hasService](this);
  }

  reset(): void {
    for (const token of this.registeredTokens) {
      token[resetService](this);
    }
    this.registeredTokens.clear();
  }
}
