import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../db/database';

export interface SyncResult {
  synced: number;
  skipped: boolean;
  error?: string;
}

interface UnsyncedEventRow {
  id: string;
  app_id: string;
  package_name: string;
  domain: string;
  bytes_sent: number;
  bytes_received: number;
  is_new_domain: number;
  timestamp: string;
}

const DEVICE_ID_KEY = 'device_id';
const BATCH_LIMIT = 100;

export function getApiBaseUrl(): string | null {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url || url.trim().length === 0) return null;
  return url.replace(/\/$/, '');
}

export async function getOrCreateDeviceId(db: SQLiteDatabase): Promise<string> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    [DEVICE_ID_KEY],
  );
  if (row?.value) return row.value;

  const deviceId = generateDeviceId();
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
    DEVICE_ID_KEY,
    deviceId,
  ]);
  return deviceId;
}

function generateDeviceId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return '00000000-0000-4000-8000-000000000001';
}

export async function loadUnsyncedNetworkEvents(
  db: SQLiteDatabase,
  limit = BATCH_LIMIT,
): Promise<UnsyncedEventRow[]> {
  return db.getAllAsync<UnsyncedEventRow>(
    `SELECT ne.id, ne.app_id, a.package_name, ne.domain, ne.bytes_sent, ne.bytes_received,
            ne.is_new_domain, ne.timestamp
     FROM network_events ne
     JOIN apps a ON a.id = ne.app_id
     WHERE ne.cloud_synced = 0
     ORDER BY ne.timestamp ASC
     LIMIT ?`,
    [limit],
  );
}

export async function markEventsSynced(db: SQLiteDatabase, eventIds: string[]): Promise<void> {
  if (eventIds.length === 0) return;
  const placeholders = eventIds.map(() => '?').join(', ');
  await db.runAsync(
    `UPDATE network_events SET cloud_synced = 1 WHERE id IN (${placeholders})`,
    eventIds,
  );
}

export async function syncPendingEvents(
  fetchFn: typeof fetch = fetch,
): Promise<SyncResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { synced: 0, skipped: true };
  }

  const db = await getDatabase();
  const rows = await loadUnsyncedNetworkEvents(db);
  if (rows.length === 0) {
    return { synced: 0, skipped: false };
  }

  const deviceId = await getOrCreateDeviceId(db);
  const payload = {
    deviceId,
    networkEvents: rows.map((row) => ({
      appPackageName: row.package_name,
      domain: row.domain,
      bytesSent: row.bytes_sent,
      bytesReceived: row.bytes_received,
      isNewDomain: row.is_new_domain === 1,
      timestamp: new Date(row.timestamp).toISOString(),
    })),
  };

  try {
    const response = await fetchFn(`${baseUrl}/api/v1/events/batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      return {
        synced: 0,
        skipped: false,
        error: `Sync failed with status ${response.status}`,
      };
    }

    const body = (await response.json()) as { success?: boolean; data?: { accepted?: number } };
    if (!body.success) {
      return { synced: 0, skipped: false, error: 'Sync response indicated failure' };
    }

    await markEventsSynced(db, rows.map((row) => row.id));
    return { synced: body.data?.accepted ?? rows.length, skipped: false };
  } catch (error) {
    return {
      synced: 0,
      skipped: false,
      error: error instanceof Error ? error.message : 'Sync request failed',
    };
  }
}
