import type {
  App,
  NetworkEvent,
  NativeNetworkEventPayload,
  RiskAssessment,
  SecurityEvent,
  TimelineEvent,
} from '@guardian/shared';
import { AppCategory, TrustLevel } from '@guardian/shared';
import { RiskDetector } from '@guardian/risk-engine';
import { EventAggregator } from './event-aggregator';
import { updateBaseline, isNewDomainForApp } from '../services/baseline-service';
import { generateAlertsFromAssessments } from '../services/alert-service';
import { applyRetentionPolicy } from '../services/retention-service';
import { StubDomainReputationProvider } from '../services/domain-reputation';
import { syncPendingEvents } from '../services/sync-service';
import { getDatabase } from '../db/database';
import i18n from '../i18n';
import type { ExplanationLocale } from '@guardian/risk-engine';
import {
  insertNetworkEvent,
  insertTimelineEvent,
  upsertApp,
  upsertBaseline,
  upsertAssessment,
  upsertAlert,
  loadApps,
  loadBaselines,
  loadNetworkEventsForApp,
  loadSecurityEventsForApp,
  loadTimelineEvents,
} from '../db/repositories';

function pipelineLocale(): ExplanationLocale {
  return i18n.language === 'he' ? 'he' : 'en';
}

function formatTrafficBytes(totalBytes: number, locale: ExplanationLocale): string {
  if (locale === 'he') {
    return `${totalBytes.toLocaleString('he-IL')} בתים`;
  }
  return `${totalBytes} bytes`;
}

export interface PipelineState {
  apps: App[];
  assessments: RiskAssessment[];
  timeline: TimelineEvent[];
}

export class EventPipeline {
  private detector = new RiskDetector();
  private aggregator = new EventAggregator();
  private reputation = new StubDomainReputationProvider();
  private packageToAppId = new Map<string, string>();
  private flushTimer: ReturnType<typeof setInterval> | null = null;

  async initialize(): Promise<PipelineState> {
    const db = await getDatabase();
    const apps = await loadApps(db);
    for (const app of apps) {
      this.packageToAppId.set(app.packageName, app.id);
    }
    return this.refreshState();
  }

  startFlushTimer(onEvents: (events: NetworkEvent[]) => void): void {
    if (this.flushTimer) return;
    this.flushTimer = setInterval(() => {
      const flushed = this.aggregator.flushExpired();
      if (flushed.length > 0) {
        void this.processNetworkEvents(flushed).then(() => onEvents(flushed));
      }
    }, 15_000);
  }

  stopFlushTimer(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
  }

  registerApp(app: App): void {
    this.packageToAppId.set(app.packageName, app.id);
  }

  resolveAppId(packageName: string): string {
    return this.packageToAppId.get(packageName) ?? `pkg-${packageName}`;
  }

  async handleNativeEvent(payload: NativeNetworkEventPayload): Promise<NetworkEvent[]> {
    const appId = this.resolveAppId(payload.packageName);
    const { flushed } = this.aggregator.ingest(payload, appId);
    const toProcess = [...flushed];
    if (toProcess.length > 0) {
      await this.processNetworkEvents(toProcess);
    }
    return toProcess;
  }

  async processNetworkEvents(events: NetworkEvent[]): Promise<void> {
    const db = await getDatabase();
    const baselines = await loadBaselines(db);

    for (const event of events) {
      const isNew = isNewDomainForApp(baselines, event.appId, event.domain);
      const enriched: NetworkEvent = { ...event, isNewDomain: isNew };
      await insertNetworkEvent(db, enriched);

      await this.reputation.lookup(event.domain);

      const baseline = updateBaseline(baselines, enriched);
      await upsertBaseline(db, baseline);

      await insertTimelineEvent(db, {
        id: `tl-${event.id}`,
        appId: event.appId,
        type: 'network',
        title: event.domain,
        description: formatTrafficBytes(event.bytesSent + event.bytesReceived, pipelineLocale()),
        timestamp: event.timestamp,
        metadata: { protocol: event.protocol, isNewDomain: isNew },
      });
    }

    await this.reassessAffectedApps(events.map((e) => e.appId));
    await applyRetentionPolicy(db);
    void syncPendingEvents().catch(() => undefined);
  }

  private async reassessAffectedApps(appIds: string[]): Promise<void> {
    const unique = [...new Set(appIds)];
    const db = await getDatabase();
    const apps = await loadApps(db);
    const baselines = await loadBaselines(db);

    for (const appId of unique) {
      let app = apps.find((a) => a.id === appId);
      if (!app) {
        app = {
          id: appId,
          packageName: appId.replace(/^pkg-/, ''),
          displayName: appId.replace(/^pkg-/, ''),
          category: AppCategory.UNKNOWN,
          isSystem: false,
          trustLevel: TrustLevel.UNKNOWN,
        };
        await upsertApp(db, app);
      }

      const networkEvents = await loadNetworkEventsForApp(db, appId);
      const securityEvents = await loadSecurityEventsForApp(db, appId);
      const baseline = baselines.find((b) => b.appId === appId);

      const assessment = this.detector.assess({
        appId,
        appCategory: app.category,
        networkEvents,
        securityEvents,
        baseline,
        trustLevel: app.trustLevel,
        locale: pipelineLocale(),
      });

      await upsertAssessment(db, assessment);
      const alerts = generateAlertsFromAssessments(apps, [assessment]);
      for (const alert of alerts) {
        await upsertAlert(db, alert);
      }

      await insertTimelineEvent(db, {
        id: `tl-assess-${assessment.id}`,
        appId,
        type: 'assessment',
        title: i18n.t(`risk.${assessment.level}`),
        description: assessment.explanation,
        level: assessment.level,
        timestamp: assessment.assessedAt,
      });
    }
  }

  async reassessApp(appId: string): Promise<void> {
    await this.reassessAffectedApps([appId]);
  }

  async reassessAllApps(): Promise<void> {
    const db = await getDatabase();
    const apps = await loadApps(db);
    if (apps.length === 0) return;
    await this.reassessAffectedApps(apps.map((a) => a.id));
  }

  async refreshState(): Promise<PipelineState> {
    const db = await getDatabase();
    const apps = await loadApps(db);
    const timeline = await loadTimelineEvents(db);
    const assessmentsRaw = await db.getAllAsync<{
      id: string;
      app_id: string;
      score: number;
      level: string;
      triggered_rules: string;
      explanation: string;
      assessed_at: string;
    }>('SELECT * FROM risk_assessments ORDER BY assessed_at DESC');

    const assessments: RiskAssessment[] = assessmentsRaw.map(
      (row: {
        id: string;
        app_id: string;
        score: number;
        level: string;
        triggered_rules: string;
        explanation: string;
        assessed_at: string;
      }) => ({
        id: row.id,
        appId: row.app_id,
        score: row.score,
        level: row.level as RiskAssessment['level'],
        triggeredRules: JSON.parse(row.triggered_rules) as string[],
        explanation: row.explanation,
        assessedAt: new Date(row.assessed_at),
      }),
    );

    return { apps, assessments, timeline };
  }
}

export async function seedSimulatorData(
  apps: App[],
  networkEventsByApp: Map<string, NetworkEvent[]>,
  securityEventsByApp: Map<string, SecurityEvent[]>,
): Promise<PipelineState> {
  const pipeline = new EventPipeline();
  await pipeline.initialize();
  const db = await getDatabase();

  for (const app of apps) {
    await upsertApp(db, app);
    pipeline.registerApp(app);
  }

  for (const [, events] of networkEventsByApp) {
    await pipeline.processNetworkEvents(events);
  }

  for (const [, events] of securityEventsByApp) {
    for (const event of events) {
      await db.runAsync(
        'INSERT OR REPLACE INTO events (id, app_id, type, metadata, timestamp) VALUES (?, ?, ?, ?, ?)',
        [
          event.id,
          event.appId,
          event.type,
          JSON.stringify(event.metadata),
          event.timestamp.toISOString(),
        ],
      );
    }
    await pipeline['reassessAffectedApps']([events[0]?.appId ?? '']);
  }

  return pipeline.refreshState();
}
