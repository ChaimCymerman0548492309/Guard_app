import type { SQLiteDatabase } from 'expo-sqlite';
import { getApiBaseUrl, resetMetadataSyncThrottle } from './sync-service';
import { clearApiAuthSession, getApiAuthToken, setApiAuthSession } from './settings-service';

export async function loginToCloudApi(
  db: SQLiteDatabase,
  email: string,
  password: string,
  fetchFn: typeof fetch = fetch,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const baseUrl = getApiBaseUrl();
  if (!baseUrl) {
    return { ok: false, error: 'API URL not configured' };
  }

  try {
    const response = await fetchFn(`${baseUrl}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = (await response.json()) as {
      success?: boolean;
      data?: { token?: string };
      error?: { message?: string };
    };
    if (!response.ok || !body.success || !body.data?.token) {
      return { ok: false, error: body.error?.message ?? 'Login failed' };
    }
    await setApiAuthSession(db, email.trim().toLowerCase(), body.data.token);
    resetMetadataSyncThrottle();
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Login failed',
    };
  }
}

export async function logoutFromCloudApi(db: SQLiteDatabase): Promise<void> {
  await clearApiAuthSession(db);
}

export async function getCloudAuthHeader(db: SQLiteDatabase): Promise<Record<string, string>> {
  const token = await getApiAuthToken(db);
  if (!token) return {};
  return { Authorization: `Bearer ${token}` };
}
