import type * as SQLite from 'expo-sqlite';
import { RETENTION } from '../../../../config/retention';
export const SETTINGS_KEYS = {
  retentionDays: 'retention_days',
  notificationsEnabled: 'notifications_enabled',
  cloudSyncEnabled: 'cloud_sync_enabled',
  language: 'language',
  onboardingComplete: 'onboarding_complete',
} as const;
async function getSetting(db: SQLite.SQLiteDatabase, key: string) { const row = await db.getFirstAsync<{ value: string }>('SELECT value FROM settings WHERE key = ?', [key]); return row?.value ?? null; }
async function setSetting(db: SQLite.SQLiteDatabase, key: string, value: string) { await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [key, value]); }
export async function getRetentionDays(db: SQLite.SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.retentionDays); return raw ? Number(raw) : RETENTION.eventsDays; }
export async function setRetentionDays(db: SQLite.SQLiteDatabase, days: number) { await setSetting(db, SETTINGS_KEYS.retentionDays, String(days)); }
export async function areNotificationsEnabled(db: SQLite.SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.notificationsEnabled); return raw === null ? true : raw === 'true'; }
export async function setNotificationsEnabled(db: SQLite.SQLiteDatabase, enabled: boolean) { await setSetting(db, SETTINGS_KEYS.notificationsEnabled, enabled ? 'true' : 'false'); }
export async function isCloudSyncEnabled(db: SQLite.SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.cloudSyncEnabled); return raw === 'true'; }
export async function setCloudSyncEnabled(db: SQLite.SQLiteDatabase, enabled: boolean) { await setSetting(db, SETTINGS_KEYS.cloudSyncEnabled, enabled ? 'true' : 'false'); }
export async function getLanguage(db: SQLite.SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.language); return raw === 'he' ? 'he' : 'en'; }
export async function setLanguage(db: SQLite.SQLiteDatabase, lang: 'en' | 'he') { await setSetting(db, SETTINGS_KEYS.language, lang); }
export async function isOnboardingComplete(db: SQLite.SQLiteDatabase) { const raw = await getSetting(db, SETTINGS_KEYS.onboardingComplete); return raw === 'true'; }
export async function setOnboardingComplete(db: SQLite.SQLiteDatabase, complete: boolean) { await setSetting(db, SETTINGS_KEYS.onboardingComplete, complete ? 'true' : 'false'); }
