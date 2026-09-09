import type * as SQLite from 'expo-sqlite';
export async function buildExportPayload(db: SQLite.SQLiteDatabase) {
  const settingsRows = await db.getAllAsync<{ key: string; value: string }>('SELECT key, value FROM settings');
  const settings: Record<string, string> = {};
  for (const row of settingsRows) settings[row.key] = row.value;
  return {
    exportedAt: new Date().toISOString(), version: '0.1.0',
    apps: await db.getAllAsync('SELECT * FROM apps'),
    events: await db.getAllAsync('SELECT * FROM events'),
    networkEvents: await db.getAllAsync('SELECT * FROM network_events'),
    timelineEvents: await db.getAllAsync('SELECT * FROM timeline_events'),
    alerts: await db.getAllAsync('SELECT * FROM alerts'),
    riskAssessments: await db.getAllAsync('SELECT * FROM risk_assessments'),
    settings,
  };
}
export async function exportDataAsJson(db: SQLite.SQLiteDatabase) { return JSON.stringify(await buildExportPayload(db), null, 2); }
