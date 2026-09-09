import type * as SQLite from 'expo-sqlite';
import type {
  Alert,
  App,
  AppBehaviorBaseline,
  NetworkEvent,
  RiskAssessment,
  SecurityEvent,
  TimelineEvent,
} from '@guardian/shared';

export async function loadApps(db: SQLite.SQLiteDatabase): Promise<App[]> {
  const rows = await db.getAllAsync<{
    id: string;
    package_name: string;
    display_name: string;
    category: string;
    is_system: number;
    trust_level: string;
  }>('SELECT * FROM apps');

  return rows.map((row) => ({
    id: row.id,
    packageName: row.package_name,
    displayName: row.display_name,
    category: row.category as App['category'],
    isSystem: row.is_system === 1,
    trustLevel: row.trust_level as App['trustLevel'],
  }));
}

export async function upsertApp(db: SQLite.SQLiteDatabase, app: App): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO apps (id, package_name, display_name, category, is_system, trust_level) VALUES (?, ?, ?, ?, ?, ?)',
    [app.id, app.packageName, app.displayName, app.category, app.isSystem ? 1 : 0, app.trustLevel],
  );
}

export async function loadBaselines(db: SQLite.SQLiteDatabase): Promise<AppBehaviorBaseline[]> {
  const rows = await db.getAllAsync<{
    app_id: string;
    avg_daily_connections: number;
    known_domains: string;
    avg_upload_bytes: number;
    active_hours: string;
    last_updated: string;
  }>('SELECT * FROM baselines');

  return rows.map((row) => ({
    appId: row.app_id,
    avgDailyConnections: row.avg_daily_connections,
    knownDomains: JSON.parse(row.known_domains) as string[],
    avgUploadBytes: row.avg_upload_bytes,
    activeHours: JSON.parse(row.active_hours) as number[],
    lastUpdated: new Date(row.last_updated),
  }));
}

export async function upsertBaseline(
  db: SQLite.SQLiteDatabase,
  baseline: AppBehaviorBaseline,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO baselines (app_id, avg_daily_connections, known_domains, avg_upload_bytes, active_hours, last_updated) VALUES (?, ?, ?, ?, ?, ?)',
    [
      baseline.appId,
      baseline.avgDailyConnections,
      JSON.stringify(baseline.knownDomains),
      baseline.avgUploadBytes,
      JSON.stringify(baseline.activeHours),
      baseline.lastUpdated.toISOString(),
    ],
  );
}

export async function insertNetworkEvent(
  db: SQLite.SQLiteDatabase,
  event: NetworkEvent,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO network_events (id, app_id, domain, bytes_sent, bytes_received, is_new_domain, protocol, direction, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      event.id,
      event.appId,
      event.domain,
      event.bytesSent,
      event.bytesReceived,
      event.isNewDomain ? 1 : 0,
      event.protocol ?? 'OTHER',
      event.direction ?? 'OUTBOUND',
      event.timestamp.toISOString(),
    ],
  );
}

export async function loadNetworkEventsForApp(
  db: SQLite.SQLiteDatabase,
  appId: string,
): Promise<NetworkEvent[]> {
  const rows = await db.getAllAsync<{
    id: string;
    app_id: string;
    domain: string;
    bytes_sent: number;
    bytes_received: number;
    is_new_domain: number;
    protocol: string;
    direction: string;
    timestamp: string;
  }>('SELECT * FROM network_events WHERE app_id = ? ORDER BY timestamp DESC LIMIT 200', [appId]);

  return rows.map((row) => ({
    id: row.id,
    appId: row.app_id,
    domain: row.domain,
    bytesSent: row.bytes_sent,
    bytesReceived: row.bytes_received,
    isNewDomain: row.is_new_domain === 1,
    protocol: row.protocol as NetworkEvent['protocol'],
    direction: row.direction as NetworkEvent['direction'],
    timestamp: new Date(row.timestamp),
  }));
}

export async function loadSecurityEventsForApp(
  db: SQLite.SQLiteDatabase,
  appId: string,
): Promise<SecurityEvent[]> {
  const rows = await db.getAllAsync<{
    id: string;
    app_id: string;
    type: string;
    metadata: string;
    timestamp: string;
  }>('SELECT * FROM events WHERE app_id = ? ORDER BY timestamp DESC LIMIT 200', [appId]);

  return rows.map((row) => ({
    id: row.id,
    appId: row.app_id,
    type: row.type as SecurityEvent['type'],
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    timestamp: new Date(row.timestamp),
  }));
}

export async function upsertAssessment(
  db: SQLite.SQLiteDatabase,
  assessment: RiskAssessment,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO risk_assessments (id, app_id, score, level, triggered_rules, explanation, assessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [
      assessment.id,
      assessment.appId,
      assessment.score,
      assessment.level,
      JSON.stringify(assessment.triggeredRules),
      assessment.explanation,
      assessment.assessedAt.toISOString(),
    ],
  );
}

export async function upsertAlert(db: SQLite.SQLiteDatabase, alert: Alert): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO alerts (id, app_id, risk_assessment_id, title, message, level, acknowledged, user_action, domain, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
    [
      alert.id,
      alert.appId,
      alert.riskAssessmentId,
      alert.title,
      alert.message,
      alert.level,
      alert.acknowledged ? 1 : 0,
      alert.userAction ?? 'NONE',
      alert.domain ?? null,
      alert.createdAt.toISOString(),
    ],
  );
}

export async function loadAlerts(db: SQLite.SQLiteDatabase): Promise<Alert[]> {
  const rows = await db.getAllAsync<{
    id: string;
    app_id: string;
    risk_assessment_id: string;
    title: string;
    message: string;
    level: string;
    acknowledged: number;
    user_action: string;
    domain: string | null;
    created_at: string;
  }>('SELECT * FROM alerts ORDER BY created_at DESC');

  return rows.map((row) => ({
    id: row.id,
    appId: row.app_id,
    riskAssessmentId: row.risk_assessment_id,
    title: row.title,
    message: row.message,
    level: row.level as Alert['level'],
    acknowledged: row.acknowledged === 1,
    userAction: row.user_action as Alert['userAction'],
    domain: row.domain ?? undefined,
    createdAt: new Date(row.created_at),
  }));
}

export async function insertTimelineEvent(
  db: SQLite.SQLiteDatabase,
  event: TimelineEvent,
): Promise<void> {
  await db.runAsync(
    'INSERT OR REPLACE INTO timeline_events (id, app_id, type, title, description, level, metadata, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [
      event.id,
      event.appId,
      event.type,
      event.title,
      event.description,
      event.level ?? null,
      JSON.stringify(event.metadata ?? {}),
      event.timestamp.toISOString(),
    ],
  );
}

export async function loadTimelineEvents(db: SQLite.SQLiteDatabase): Promise<TimelineEvent[]> {
  const rows = await db.getAllAsync<{
    id: string;
    app_id: string;
    type: string;
    title: string;
    description: string;
    level: string | null;
    metadata: string;
    timestamp: string;
  }>('SELECT * FROM timeline_events ORDER BY timestamp DESC LIMIT 500');

  return rows.map((row) => ({
    id: row.id,
    appId: row.app_id,
    type: row.type as TimelineEvent['type'],
    title: row.title,
    description: row.description,
    level: (row.level as TimelineEvent['level']) ?? undefined,
    metadata: JSON.parse(row.metadata) as Record<string, unknown>,
    timestamp: new Date(row.timestamp),
  }));
}

export function computeRiskCounts(assessments: RiskAssessment[]): {
  safe: number;
  unusual: number;
  suspicious: number;
} {
  const counts = { safe: 0, unusual: 0, suspicious: 0 };
  for (const a of assessments) {
    switch (a.level) {
      case 'SAFE':
        counts.safe++;
        break;
      case 'UNUSUAL':
        counts.unusual++;
        break;
      case 'SUSPICIOUS':
        counts.suspicious++;
        break;
    }
  }
  return counts;
}
