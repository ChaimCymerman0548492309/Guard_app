import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  getApiBaseUrl,
  syncPendingEvents,
  getOrCreateDeviceId,
  markEventsSynced,
  loadUnsyncedNetworkEvents,
  countUnsyncedNetworkEvents,
  deriveSyncStatus,
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
    expect(fetchFn).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/events/batch',
      expect.objectContaining({ method: 'POST' }),
    );
    expect(mockDb.runAsync).toHaveBeenCalledWith(
      'UPDATE network_events SET cloud_synced = 1 WHERE id IN (?)',
      ['evt-1'],
    );
  });

  it('syncPendingEvents retries on server errors', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000');
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ value: 'device-id' });
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 'evt-1',
        app_id: 'app-1',
        package_name: 'com.example.app',
        domain: 'tracker.example',
        bytes_sent: 10,
        bytes_received: 5,
        is_new_domain: 0,
        timestamp: '2026-01-01T12:00:00.000Z',
      },
    ]);

    const fetchFn = vi
      .fn()
      .mockResolvedValueOnce({ ok: false, status: 503 })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, data: { accepted: 1 } }),
      });

    const result = await syncPendingEvents(fetchFn);

    expect(fetchFn).toHaveBeenCalledTimes(2);
    expect(result.synced).toBe(1);
  });

  it('syncPendingEvents keeps events queued when offline', async () => {
    vi.stubEnv('EXPO_PUBLIC_API_URL', 'http://localhost:3000');
    mockDb.getFirstAsync
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ value: 'device-id' });
    mockDb.getAllAsync.mockResolvedValue([
      {
        id: 'evt-1',
        app_id: 'app-1',
        package_name: 'com.example.app',
        domain: 'tracker.example',
        bytes_sent: 10,
        bytes_received: 5,
        is_new_domain: 0,
        timestamp: '2026-01-01T12:00:00.000Z',
      },
    ]);

    const fetchFn = vi.fn().mockRejectedValue(new Error('Network request failed'));
    const result = await syncPendingEvents(fetchFn);

    expect(result.synced).toBe(0);
    expect(result.pending).toBe(2);
    expect(result.error).toContain('Network request failed');
    expect(mockDb.runAsync).not.toHaveBeenCalled();
  });

  it('countUnsyncedNetworkEvents returns pending count', async () => {
    mockDb.getFirstAsync.mockResolvedValue({ count: 7 });
    const count = await countUnsyncedNetworkEvents(mockDb as never);
    expect(count).toBe(7);
  });

  it('deriveSyncStatus maps API and queue state', () => {
    expect(deriveSyncStatus(false, 0, false)).toBe('disabled');
    expect(deriveSyncStatus(true, 0, false)).toBe('idle');
    expect(deriveSyncStatus(true, 3, true)).toBe('syncing');
    expect(deriveSyncStatus(true, 3, false, 'Network request failed')).toBe('offline');
    expect(deriveSyncStatus(true, 3, false, 'Sync failed with status 400')).toBe('error');
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
