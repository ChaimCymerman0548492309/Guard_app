import type {
  Alert,
  App,
  DashboardSummary,
  DeviceInfo,
  DeviceSummary,
  RiskAssessment,
  RiskLevel,
} from '@guardian/shared';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface AppWithRisk extends App {
  riskLevel: string;
  riskScore: number;
  deviceId?: string;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, init);
  const body = (await response.json()) as ApiEnvelope<T> | { success: false; error: { message: string } };
  if (!response.ok || !('data' in body)) {
    const message = 'error' in body ? body.error.message : response.statusText;
    throw new Error(message || 'Request failed');
  }
  return body.data;
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return fetchJson('/api/v1/dashboard/summary');
}

export function listDevices(): Promise<DeviceInfo[]> {
  return fetchJson('/api/v1/devices');
}

export function getDeviceSummary(deviceId: string): Promise<DeviceSummary> {
  return fetchJson(`/api/v1/devices/${deviceId}/summary`);
}

export function listDeviceApps(deviceId: string): Promise<AppWithRisk[]> {
  return fetchJson(`/api/v1/devices/${deviceId}/apps`);
}

export function listDeviceAlerts(deviceId: string, acknowledged?: boolean): Promise<Alert[]> {
  const query = acknowledged === undefined ? '' : `?acknowledged=${acknowledged}`;
  return fetchJson(`/api/v1/devices/${deviceId}/alerts${query}`);
}

export function getAppDetails(appId: string): Promise<App & { assessment?: RiskAssessment }> {
  return fetchJson(`/api/v1/apps/${appId}`);
}

export function runDeviceDemo(deviceId: string): Promise<{ ok: true }> {
  return fetchJson(`/api/v1/devices/${deviceId}/demo`, { method: 'POST' });
}

export function alertAction(
  alertId: string,
  action: 'block' | 'allow' | 'ignore',
): Promise<Alert> {
  return fetchJson(`/api/v1/alerts/${alertId}/${action}`, { method: 'POST' });
}

export function riskLabel(level: RiskLevel | string, locale: 'he' | 'en'): string {
  const labels = {
    en: { SAFE: 'Safe', UNUSUAL: 'Unusual', SUSPICIOUS: 'Suspicious' },
    he: { SAFE: 'בטוח', UNUSUAL: 'חריג', SUSPICIOUS: 'חשוד' },
  } as const;
  return labels[locale][level as keyof typeof labels.en] ?? level;
}

export function formatDate(value: Date | string | null, locale: 'he' | 'en'): string {
  if (!value) return locale === 'he' ? 'לא סונכרן' : 'Never synced';
  const date = typeof value === 'string' ? new Date(value) : value;
  return date.toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
