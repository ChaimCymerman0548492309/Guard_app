import type * as SQLite from 'expo-sqlite';
import { RETENTION } from '../../../../config/retention';
import { getRetentionDays, setRetentionDays } from './settings-service';
export { getRetentionDays, setRetentionDays };
export async function applyRetentionPolicy(db: SQLite.SQLiteDatabase): Promise<void> {
  const days = await getRetentionDays(db);
  const now = Date.now();
  const eventCutoff = new Date(now - days * 86400000).toISOString();
  const networkCutoff = new Date(now - RETENTION.networkEventsDays * 86400000).toISOString();
  await db.runAsync('DELETE FROM events WHERE timestamp < ?', [eventCutoff]);
  await db.runAsync('DELETE FROM network_events WHERE timestamp < ?', [networkCutoff]);
  await db.runAsync('DELETE FROM timeline_events WHERE timestamp < ?', [eventCutoff]);
}
