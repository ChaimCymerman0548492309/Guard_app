import * as Localization from 'expo-localization';
import type { SQLiteDatabase } from 'expo-sqlite';
import { RETENTION } from '../../../../config/retention';
export const SETTINGS_KEYS = {
  retentionDays: 'retention_days',
  notificationsEnabled: 'notifications_enabled',
  cloudSyncEnabled: 'cloud_sync_enabled',
  language: 'language',
  onboardingComplete: 'onboarding_complete',
  apiAuthToken: 'api_auth_token',
  apiAuthEmail: 'api_auth_email',
} as const;
async function getSetting(db: SQLiteDatabase, key: string) { const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]); return row?.value ?? null; }
async function setSetting(db: SQLiteDatabase, key: string, value: string) { await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]); }
export async function getRetentionDays(db: SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.retentionDays); return raw ? Number(raw) : RETENTION.eventsDays; }
export async function setRetentionDays(db: SQLiteDatabase, days: number) { await setSetting(db, SETTINGS_KEYS.retentionDays, String(days)); }
export async function areNotificationsEnabled(db: SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.notificationsEnabled); return raw === null ? true : raw === 'true'; }
export async function setNotificationsEnabled(db: SQLiteDatabase, enabled: boolean) { await setSetting(db, SETTINGS_KEYS.notificationsEnabled, enabled ? 'true' : 'false'); }
export async function isCloudSyncEnabled(db: SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.cloudSyncEnabled); return raw === 'true'; }
export async function setCloudSyncEnabled(db: SQLiteDatabase, enabled: boolean) { await setSetting(db, SETTINGS_KEYS.cloudSyncEnabled, enabled ? 'true' : 'false'); }
export async function getLanguage(db: SQLiteDatabase) {
  const raw = await getSetting(db, SETTINGS_KEYS.language);
  if (raw === 'he' || raw === 'en') return raw;
  const deviceLocale = Localization.getLocales()[0]?.languageCode;
  return deviceLocale === 'en' ? 'en' : 'he';
}
export async function setLanguage(db: SQLiteDatabase, lang: 'en' | 'he') { await setSetting(db, SETTINGS_KEYS.language, lang); }
export async function isOnboardingComplete(db: SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.onboardingComplete); return raw === 'true'; }
export async function setOnboardingComplete(db: SQLiteDatabase, complete: boolean) { await setSetting(db, SETTINGS_KEYS.onboardingComplete, complete ? 'true' : 'false'); }
export async function getApiAuthToken(db: SQLiteDatabase) { return getSetting(db, SETTINGS_KEYS.apiAuthToken); }
export async function getApiAuthEmail(db: SQLiteDatabase) { return getSetting(db, SETTINGS_KEYS.apiAuthEmail); }
export async function setApiAuthSession(db: SQLiteDatabase, email: string, token: string) {
  await setSetting(db, SETTINGS_KEYS.apiAuthEmail, email);
  await setSetting(db, SETTINGS_KEYS.apiAuthToken, token);
}
export async function clearApiAuthSession(db: SQLiteDatabase) {
  await setSetting(db, SETTINGS_KEYS.apiAuthEmail, '');
  await setSetting(db, SETTINGS_KEYS.apiAuthToken, '');
}
