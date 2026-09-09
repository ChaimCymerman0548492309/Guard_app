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

CREATE TABLE IF NOT EXISTS network_events (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  domain TEXT NOT NULL,
  bytes_sent INTEGER NOT NULL DEFAULT 0,
  bytes_received INTEGER NOT NULL DEFAULT 0,
  is_new_domain INTEGER NOT NULL DEFAULT 0,
  protocol TEXT NOT NULL DEFAULT 'OTHER',
  direction TEXT NOT NULL DEFAULT 'OUTBOUND',
  timestamp TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS baselines (
  app_id TEXT PRIMARY KEY,
  avg_daily_connections INTEGER NOT NULL DEFAULT 0,
  known_domains TEXT NOT NULL DEFAULT '[]',
  avg_upload_bytes INTEGER NOT NULL DEFAULT 0,
  active_hours TEXT NOT NULL DEFAULT '[]',
  last_updated TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS timeline_events (
  id TEXT PRIMARY KEY,
  app_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  level TEXT,
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
  user_action TEXT NOT NULL DEFAULT 'NONE',
  domain TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (app_id) REFERENCES apps(id)
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`;
