import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

async function migrateDatabase(database: SQLite.SQLiteDatabase): Promise<void> {
  const columns = await database.getAllAsync<{ name: string }>(
    'PRAGMA table_info(network_events)',
  );
  if (!columns.some((column) => column.name === 'cloud_synced')) {
    await database.execAsync(
      'ALTER TABLE network_events ADD COLUMN cloud_synced INTEGER NOT NULL DEFAULT 0',
    );
  }
}

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('guardian.db');
    await db.execAsync(CREATE_TABLES_SQL);
    await migrateDatabase(db);
  }
  return db;
}

export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM alerts;
    DELETE FROM risk_assessments;
    DELETE FROM timeline_events;
    DELETE FROM network_events;
    DELETE FROM baselines;
    DELETE FROM events;
    DELETE FROM apps;
  `);
}
