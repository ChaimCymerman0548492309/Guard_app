import type {
  Alert,
  App,
  AuthTokenResponse,
  AuthUser,
  DashboardSummary,
  DeviceInfo,
  DeviceSummary,
  NetworkEvent,
  RiskAssessment,
  RiskLevel,
} from '@guardian/shared';
import { UserRole } from '@guardian/shared';
import { authHeaders } from './auth-storage';
import { apiUrl } from './api-base';

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface AppWithRisk extends App {
  riskLevel: string;
  riskScore: number;
  deviceId?: string;
  explanation?: string;
  assessedAt?: string | Date;
}

async function fetchJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(),
      ...(init?.headers ?? {}),
    },
  });
  const body = (await response.json()) as
    ApiEnvelope<T> | { success: false; error: { message: string } };
  if (!response.ok || !('data' in body)) {
    const message = 'error' in body ? body.error.message : response.statusText;
    throw new Error(message || 'Request failed');
  }
  return body.data;
}

export function login(email: string, password: string): Promise<AuthTokenResponse> {
  return fetchJson('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
}

export function fetchMe(): Promise<AuthUser> {
  return fetchJson('/api/v1/auth/me');
}

export function listUsers(): Promise<AuthUser[]> {
  return fetchJson('/api/v1/auth/users');
}

export function createCustomerUser(input: {
  email: string;
  password: string;
  name?: string;
}): Promise<AuthUser> {
  return fetchJson('/api/v1/auth/users', {
    method: 'POST',
    body: JSON.stringify({ ...input, role: UserRole.CUSTOMER }),
  });
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

export function listDeviceEvents(deviceId: string, limit = 40): Promise<NetworkEvent[]> {
  return fetchJson(`/api/v1/events?deviceId=${encodeURIComponent(deviceId)}&limit=${limit}`);
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

export function alertAction(alertId: string, action: 'block' | 'allow' | 'ignore'): Promise<Alert> {
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
