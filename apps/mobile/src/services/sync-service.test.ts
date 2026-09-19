import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getApiBaseUrl,
  syncPendingEvents,
  countUnsyncedNetworkEvents,
  deriveSyncStatus,
} from './sync-service';
import { isCloudSyncEnabled } from './settings-service';

vi.mock('./settings-service', () => ({
  isCloudSyncEnabled: vi.fn(async () => true),
}));

vi.mock('./cloud-auth-service', () => ({
  getCloudAuthHeader: vi.fn(async () => ({ Authorization: 'Bearer test-token' })),
}));

const mockDb = {
  getFirstAsync: vi.fn(),
  runAsync: vi.fn(),
  getAllAsync: vi.fn(),
};

vi.mock('../db/database', () => ({
  getDatabase: vi.fn(async () => mockDb),
}));

describe('sync-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(isCloudSyncEnabled).mockResolvedValue(true);
    mockDb.getFirstAsync.mockReset();
    mockDb.getAllAsync.mockReset();
    mockDb.runAsync.mockReset();
    vi.unstubAllEnvs();
  });

  it('getApiBaseUrl returns null when unset', () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    expect(getApiBaseUrl()).toBeNull();
  });

  it('syncPendingEvents skips when API URL is not configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    expect(await syncPendingEvents()).toEqual({ synced: 0, skipped: true });
  });

  it('syncPendingEvents posts batch and marks events synced', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000');
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ value: '00000000-0000-4000-8000-000000000001' });
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 'evt-1',
        app_id: 'app-1',
        package_name: 'com.example.app',
        domain: 'tracker.example',
        bytes_sent: 100,
        bytes_received: 50,
        is_new_domain: 1,
        timestamp: '2026-01-01T12:00:00.000Z',
      },
    ]);

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { accepted: 1 } }),
    });

    const result = await syncPendingEvents(fetchFn);
    expect(result).toEqual({ synced: 1, skipped: false, pending: 0 });
    expect(fetchFn).toHaveBeenCalled();
  });

  it('countUnsyncedNetworkEvents returns pending count', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 7 });
    expect(await countUnsyncedNetworkEvents(mockDb as never)).toBe(7);
  });

  it('deriveSyncStatus maps API and queue state', () => {
    expect(deriveSyncStatus(false, 0, false)).toBe('disabled');
    expect(deriveSyncStatus(true, 0, false)).toBe('idle');
  });
});
