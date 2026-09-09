import type * as SQLite from 'expo-sqlite';
import { RETENTION } from '../../../../config/retention';

export async function applyRetentionPolicy(db: SQLite.SQLiteDatabase): Promise<void> {
  const now = Date.now();
  const eventCutoff = new Date(now - RETENTION.eventsDays * 86_400_000).toISOString();
  const networkCutoff = new Date(now - RETENTION.networkEventsDays * 86_400_000).toISOString();
  const alertCutoff = new Date(now - RETENTION.alertsDays * 86_400_000).toISOString();
  const assessmentCutoff = new Date(now - RETENTION.assessmentsDays * 86_400_000).toISOString();

  await db.runAsync('DELETE FROM events WHERE timestamp < ?', [eventCutoff]);
  await db.runAsync('DELETE FROM network_events WHERE timestamp < ?', [networkCutoff]);
  await db.runAsync('DELETE FROM timeline_events WHERE timestamp < ?', [eventCutoff]);
  await db.runAsync('DELETE FROM alerts WHERE created_at < ? AND acknowledged = 1', [alertCutoff]);
  await db.runAsync('DELETE FROM risk_assessments WHERE assessed_at < ?', [assessmentCutoff]);
}

export async function getRetentionDays(db: SQLite.SQLiteDatabase): Promise<number> {
  const row = await db.getFirstAsync<{ value: string }>(
    'SELECT value FROM settings WHERE key = ?',
    ['retention_days'],
  );
  return row ? Number(row.value) : RETENTION.eventsDays;
}

export async function setRetentionDays(db: SQLite.SQLiteDatabase, days: number): Promise<void> {
  await db.runAsync('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)', [
    'retention_days',
    String(days),
  ]);
}
