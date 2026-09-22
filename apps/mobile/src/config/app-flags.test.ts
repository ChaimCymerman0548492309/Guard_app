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

  it('isDevSimulatorEnabled is always false (real devices only)', async () => {
    process.env.EXPO_PUBLIC_DEV_SIMULATOR = 'true';
    const { isDevSimulatorEnabled } = await import('./app-flags');
    expect(isDevSimulatorEnabled()).toBe(false);
  });

  it('showDevUi is always false', async () => {
    process.env.EXPO_PUBLIC_DEV_SIMULATOR = 'true';
    const { showDevUi } = await import('./app-flags');
    expect(showDevUi()).toBe(false);
  });
});
