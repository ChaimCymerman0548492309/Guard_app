import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getApiBaseUrl,
  syncPendingEvents,
  getOrCreateDeviceId,
  markEventsSynced,
  loadUnsyncedNetworkEvents,
} from './sync-service';

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
    vi.unstubAllEnvs();
  });

  it('getApiBaseUrl returns null when unset', () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    expect(getApiBaseUrl()).toBeNull();
  });

  it('getApiBaseUrl strips trailing slash', () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000/');
    expect(getApiBaseUrl()).toBe('http://localhost:3000');
  });

  it('syncPendingEvents skips when API URL is not configured', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', '');
    const result = await syncPendingEvents();
    expect(result).toEqual({ synced: 0, skipped: true });
  });

  it('getOrCreateDeviceId returns existing value', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ value: 'existing-device-id' });
    const id = await getOrCreateDeviceId(mockDb as never);
    expect(id).toBe('existing-device-id');
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('syncPendingEvents posts batch and marks events synced', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000');
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
    mockDb.getFirstAsync.mockResolvedValue({ value: '00000000-0000-4000-8000-000000000001' });

    const fetchFn = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: { accepted: 1 } }),
    });

    const result = await syncPendingEvents(fetchFn);

    expect(result).toEqual({ synced: 1, skipped: false });
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/events/batch',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE network_events SET cloud_synced = 1 WHERE id IN (?)',
      ['evt-1'],
    );
  });

  it('loadUnsyncedNetworkEvents queries unsynced rows', async () => {
    mockDb.getAllAsync.mockResolvedValue([]);
    await loadUnsyncedNetworkEvents(mockDb as never, 25);
    expect(mockDb.getAllAsync).toHaveBeenCalledWith(expect.stringContaining('cloud_synced = 0'), [
      25,
    ]);
  });

  it('markEventsSynced is a no-op for empty ids', async () => {
    await markEventsSynced(mockDb as never, []);
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });
});
