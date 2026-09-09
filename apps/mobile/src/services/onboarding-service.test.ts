import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  isOnboardingComplete,
  setOnboardingComplete,
  SETTINGS_KEYS,
} from './settings-service';

const mockDb = { getFirstAsync: vi.fn(), runAsync: vi.fn() };

describe('onboarding settings', () => {
  beforeEach(() => vi.clearAllMocks());

  it('defaults to not onboarded', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await isOnboardingComplete(mockDb as never)).toBe(false);
  });

  it('reads completed onboarding flag', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: 'true' });
    expect(await isOnboardingComplete(mockDb as never)).toBe(true);
  });

  it('persists onboarding completion', async () => {
    await setOnboardingComplete(mockDb as never, true);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [SETTINGS_KEYS.onboardingComplete, 'true'],
    );
  });
});
