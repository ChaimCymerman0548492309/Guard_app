import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_SQL } from './schema';

let db: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!db) {
    db = await SQLite.openDatabaseAsync('guardian.db');
    await db.execAsync(CREATE_TABLES_SQL);
  }
  return db;
}

export async function clearDatabase(): Promise<void> {
  const database = await getDatabase();
  await database.execAsync(`
    DELETE FROM alerts;
    DELETE FROM risk_assessments;
    DELETE FROM events;
    DELETE FROM apps;
  `);
}
