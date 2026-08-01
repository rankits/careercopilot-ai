import { describe, expect, it } from 'vitest';
import {
  createModuleServiceToken,
  ModuleServiceRegistry,
} from '@/shared/registry/module-service.registry.js';

interface ExampleService {
  read(): string;
}

describe('ModuleServiceRegistry', () => {
  it('registers and resolves a service through its typed token', () => {
    const registry = new ModuleServiceRegistry();
    const token = createModuleServiceToken<ExampleService>('example');
    const service: ExampleService = { read: () => 'ok' };

    registry.register(token, service);

    expect(registry.has(token)).toBe(true);
    expect(registry.resolve(token)).toBe(service);
  });

  it('rejects duplicate registration', () => {
    const registry = new ModuleServiceRegistry();
    const token = createModuleServiceToken<ExampleService>('example');
    registry.register(token, { read: () => 'first' });

    expect(() => registry.register(token, { read: () => 'second' })).toThrow(
      'Module service already registered: example',
    );
  });

  it('rejects missing resolution and supports isolated reset', () => {
    const registry = new ModuleServiceRegistry();
    const token = createModuleServiceToken<ExampleService>('example');

    expect(() => registry.resolve(token)).toThrow('Module service is not registered: example');

    registry.register(token, { read: () => 'ok' });
    registry.reset();
    expect(registry.has(token)).toBe(false);
  });
});
