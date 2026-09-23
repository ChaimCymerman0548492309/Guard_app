import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('expo-localization', () => ({
  getLocales: vi.fn(() => [{ languageCode: 'en' }]),
}));

import * as Localization from 'expo-localization';
import {
  getRetentionDays,
  isCloudSyncEnabled,
  areNotificationsEnabled,
  SETTINGS_KEYS,
  setRetentionDays,
  getLanguage,
  setLanguage,
} from './settings-service';
const mockDb = { getFirstAsync: vi.fn(), runAsync: vi.fn() };
describe('settings-service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('default retention is 30 days', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getRetentionDays(mockDb as never)).toBe(30);
  });
  it('cloud sync defaults off', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await isCloudSyncEnabled(mockDb as never)).toBe(false);
  });
  it('notifications default on', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await areNotificationsEnabled(mockDb as never)).toBe(true);
  });
  it('persists retention', async () => {
    await setRetentionDays(mockDb as never, 14);
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [SETTINGS_KEYS.retentionDays, '14'],
    );
  });
  it('language defaults from device when unset', async () => {
    mockDb.getFirstAsync.mockResolvedValue(null);
    expect(await getLanguage(mockDb as never)).toBe('en');
    vi.mocked(Localization.getLocales).mockReturnValueOnce([{ languageCode: 'he' }]);
    expect(await getLanguage(mockDb as never)).toBe('he');
  });
  it('persists hebrew language', async () => {
    await setLanguage(mockDb as never, 'he');
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
      [SETTINGS_KEYS.language, 'he'],
    );
  });
});
