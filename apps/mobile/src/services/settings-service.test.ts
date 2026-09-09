import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getRetentionDays, isCloudSyncEnabled, areNotificationsEnabled, SETTINGS_KEYS, setRetentionDays } from './settings-service';
const mockDb = { getFirstAsync: vi.fn(), runAsync: vi.fn() };
describe('settings-service', () => {
  beforeEach(() => vi.clearAllMocks());
  it('default retention is 30 days', async () => { mockDb.getFirstAsync.mockResolvedValue(null); expect(await getRetentionDays(mockDb as never)).toBe(30); });
  it('cloud sync defaults off', async () => { mockDb.getFirstAsync.mockResolvedValue(null); expect(await isCloudSyncEnabled(mockDb as never)).toBe(false); });
  it('notifications default on', async () => { mockDb.getFirstAsync.mockResolvedValue(null); expect(await areNotificationsEnabled(mockDb as never)).toBe(true); });
  it('persists retention', async () => { await setRetentionDays(mockDb as never, 14); expect(mockDb.runAsync).toHaveBeenCalledWith('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [SETTINGS_KEYS.retentionDays, '14']); });
});
