import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

describe('app production flags', () => {
  const originalDevSimulator = process.env.EXPO_PUBLIC_DEV_SIMULATOR;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalDevSimulator === undefined) {
      delete process.env.EXPO_PUBLIC_DEV_SIMULATOR;
    } else {
      process.env.EXPO_PUBLIC_DEV_SIMULATOR = originalDevSimulator;
    }
  });

  it('isDevSimulatorEnabled is false when env is unset', async () => {
    delete process.env.EXPO_PUBLIC_DEV_SIMULATOR;
    const { isDevSimulatorEnabled } = await import('./app-flags');
    expect(isDevSimulatorEnabled()).toBe(false);
  });

  it('isDevSimulatorEnabled is true only when explicitly set', async () => {
    process.env.EXPO_PUBLIC_DEV_SIMULATOR = 'true';
    const { isDevSimulatorEnabled } = await import('./app-flags');
    expect(isDevSimulatorEnabled()).toBe(true);
  });

  it('isDevSimulatorEnabled is false when set to false', async () => {
    process.env.EXPO_PUBLIC_DEV_SIMULATOR = 'false';
    const { isDevSimulatorEnabled } = await import('./app-flags');
    expect(isDevSimulatorEnabled()).toBe(false);
  });

  it('showDevUi requires both __DEV__ and simulator flag', async () => {
    process.env.EXPO_PUBLIC_DEV_SIMULATOR = 'true';
    const { showDevUi } = await import('./app-flags');
    // In vitest/node, __DEV__ is undefined/falsy — mirrors production
    expect(showDevUi()).toBe(false);
  });
});
