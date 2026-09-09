export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS apps (
  id TEXT PRIMARY KEY,
  package_name TEXT NOT NULL,
  display_name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_system INTEGER NOT NULL DEFAULT 0,
  trust_level TEXT NOT NULL DEFAULT 'NEUTRAL'
);

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  type TEXT NOT NULL,
  metadata TEXT NOT NULL DEFAULT '{}',
  timestamp TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS risk_assessments (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  score INTEGER NOT NULL,
  level TEXT NOT NULL,
  triggered_rules TEXT NOT NULL DEFAULT '[]',
  explanation TEXT NOT NULL,
  assessed_at TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS alerts (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  risk_assessment_id TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  level TEXT NOT NULL,
  acknowledged INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
