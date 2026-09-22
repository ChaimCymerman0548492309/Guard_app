import type { SQLiteDatabase } from 'expo-sqlite';
import { getDatabase } from '../db/database';
import {
  loadApps,
  loadAlerts,
  loadLatestAssessmentsPerApp,
} from '../db/repositories';
import { isCloudSyncEnabled } from './settings-service';
import { getCloudAuthHeader } from './cloud-auth-service';
import * as Device from 'expo-device';

export interface SyncResult {
  synced: number;
  skipped: boolean;
  pending?: number;
  error?: string;
}

export type SyncStatus = 'disabled' | 'idle' | 'syncing' | 'error' | 'offline';

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
const MAX_RETRIES = 3;
const BASE_RETRY_DELAY_MS = 500;
const METADATA_SYNC_INTERVAL_MS = 30_000;

let lastMetadataSyncAt = 0;

export function resetMetadataSyncThrottle(): void {
  lastMetadataSyncAt = 0;
}

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

function buildDeviceDisplayName(): string {
  const model = Device.modelName ?? Device.deviceName;
  if (model && model.length > 0) {
    return model;
  }
  return 'Android device';
}

export async function countUnsyncedNetworkEvents(db: SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ count: number }>(
    'SELECT COUNT(*) as count FROM network_events WHERE cloud_synced = 0',
  );
  return row?.count ?? 0;
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

function isRetryableStatus(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

function isOfflineError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes('network request failed') ||
    message.includes('failed to fetch') ||
    message.includes('networkerror') ||
    message.includes('timeout')
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function postBatchWithRetry(
  baseUrl: string,
  deviceId: string,
  payload: unknown,
  fetchFn: typeof fetch,
  authHeaders: Record<string, string>,
): Promise<
  | {
      ok: true;
      accepted: number;
      acceptedEventIds: string[];
    }
  | { ok: false; error: string; offline: boolean }
> {
  let lastError = 'Sync request failed';

  for (let attempt = 0; attempt < MAX_RETRIES; attempt += 1) {
    try {
      const response = await fetchFn(`${baseUrl}/api/v1/events/batch`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Device-Id': deviceId,
          ...authHeaders,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        const body = (await response.json()) as {
          success?: boolean;
          data?: { accepted?: number; acceptedEventIds?: string[] };
        };
        if (!body.success) {
          return { ok: false, error: 'Sync response indicated failure', offline: false };
        }
        return {
          ok: true,
          accepted: body.data?.accepted ?? 0,
          acceptedEventIds: body.data?.acceptedEventIds ?? [],
        };
      }

      lastError = `Sync failed with status ${response.status}`;
      if (!isRetryableStatus(response.status) || attempt === MAX_RETRIES - 1) {
        return { ok: false, error: lastError, offline: false };
      }
    } catch (error) {
      lastError = error instanceof Error ? error.message : 'Sync request failed';
      if (!isOfflineError(error) || attempt === MAX_RETRIES - 1) {
        return { ok: false, error: lastError, offline: isOfflineError(error) };
      }
    }

    await sleep(BASE_RETRY_DELAY_MS * 2 ** attempt);
  }

  return { ok: false, error: lastError, offline: true };
}

function shouldSendMetadata(pendingNetworkEvents: number): boolean {
  if (pendingNetworkEvents > 0) return true;
  const now = Date.now();
  if (now - lastMetadataSyncAt >= METADATA_SYNC_INTERVAL_MS) {
    lastMetadataSyncAt = now;
    return true;
  }
  return false;
}

export async function syncPendingEvents(
  fetchFn: typeof fetch = fetch,
): Promise<SyncResult> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { synced: 0, skipped: true };
  }

  const db = await getDatabase();
  if (!(await isCloudSyncEnabled(db))) return { synced: 0, skipped: true };

  const pending = await countUnsyncedNetworkEvents(db);
  if (!shouldSendMetadata(pending)) {
    return { synced: 0, skipped: false, pending };
  }

  const rows = await loadUnsyncedNetworkEvents(db);
  const authHeaders = await getCloudAuthHeader(db);
  if (!authHeaders.Authorization) {
    return { synced: 0, skipped: false, pending, error: 'Cloud login required' };
  }

  const apps = await loadApps(db);
  const assessments = await loadLatestAssessmentsPerApp(db);
  const alerts = await loadAlerts(db);
  const appIdToPackage = new Map(apps.map((a) => [a.id, a.packageName]));

  const deviceId = await getOrCreateDeviceId(db);
  const payload = {
    deviceId,
    deviceName: buildDeviceDisplayName(),
    platform: 'android',
    apps: apps.map((app) => ({
      packageName: app.packageName,
      displayName: app.displayName,
      category: app.category,
      isSystem: app.isSystem,
      trustLevel: app.trustLevel,
    })),
    assessments: assessments.map((assessment) => ({
      id: assessment.id,
      packageName: appIdToPackage.get(assessment.appId) ?? assessment.appId.replace(/^pkg-/, ''),
      score: assessment.score,
      level: assessment.level,
      triggeredRules: assessment.triggeredRules,
      explanation: assessment.explanation,
      assessedAt: assessment.assessedAt.toISOString(),
    })),
    alerts: alerts.slice(0, 100).map((alert) => ({
      id: alert.id,
      packageName: appIdToPackage.get(alert.appId) ?? alert.appId.replace(/^pkg-/, ''),
      riskAssessmentId: alert.riskAssessmentId,
      title: alert.title,
      message: alert.message,
      level: alert.level,
      acknowledged: alert.acknowledged,
      userAction: alert.userAction,
      domain: alert.domain,
      createdAt: alert.createdAt.toISOString(),
    })),
    networkEvents: rows.map((row) => ({
      clientEventId: row.id,
      appPackageName: row.package_name,
      domain: row.domain,
      bytesSent: row.bytes_sent,
      bytesReceived: row.bytes_received,
      isNewDomain: row.is_new_domain === 1,
      timestamp: new Date(row.timestamp).toISOString(),
    })),
  };

  if (
    payload.networkEvents.length === 0 &&
    payload.apps.length === 0 &&
    payload.assessments.length === 0 &&
    payload.alerts.length === 0
  ) {
    return { synced: 0, skipped: false, pending: 0 };
  }

  const result = await postBatchWithRetry(baseUrl, deviceId, payload, fetchFn, authHeaders);
  if (!result.ok) {
    return {
      synced: 0,
      skipped: false,
      pending,
      error: result.error,
    };
  }

  if (result.acceptedEventIds.length > 0) {
    await markEventsSynced(db, result.acceptedEventIds);
  }

  const remaining = Math.max(0, pending - result.acceptedEventIds.length);
  return {
    synced: result.acceptedEventIds.length,
    skipped: false,
    pending: remaining,
  };
}

export function deriveSyncStatus(
  apiConfigured: boolean,
  pending: number,
  isSyncing: boolean,
  lastError?: string,
): SyncStatus {
  if (!apiConfigured) return 'disabled';
  if (isSyncing) return 'syncing';
  if (lastError && pending > 0) {
    if (
      lastError.toLowerCase().includes('network') ||
      lastError.toLowerCase().includes('fetch') ||
      lastError.toLowerCase().includes('timeout')
    ) {
      return 'offline';
    }
    return 'error';
  }
  if (pending > 0) return 'offline';
  return 'idle';
}
