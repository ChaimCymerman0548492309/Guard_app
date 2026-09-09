import { createSimulator, generateEvents } from '@guardian/simulator';
import type { SimulatorResult } from '@guardian/simulator';
import type { Alert, App, NetworkEvent, RiskAssessment, RiskCounts } from '@guardian/shared';
import { AlertAction, RiskLevel, SimulatorScenario } from '@guardian/shared';
import { isDatabaseAvailable, prisma } from './prisma.js';

export interface AppWithRisk extends App {
  riskLevel: string;
  riskScore: number;
}

export interface DashboardSummary {
  counts: RiskCounts;
  totalApps: number;
  recentAlerts: Array<{
    appId: string;
    appName: string;
    level: string;
    explanation: string;
    assessedAt: Date;
  }>;
}

const SCENARIO_MAP: Record<string, SimulatorScenario> = {
  'app-whatsapp': SimulatorScenario.NORMAL,
  'app-google-photos': SimulatorScenario.NORMAL,
  'app-photo-editor': SimulatorScenario.HIGH_RISK,
  'app-calculator': SimulatorScenario.NORMAL,
  'app-unknown': SimulatorScenario.UNUSUAL,
};

interface SimulatorCache {
  result: SimulatorResult;
  networkEvents: NetworkEvent[];
  alerts: Alert[];
}

let simulatorCache: SimulatorCache | null = null;
const simulatorAlertOverrides = new Map<string, Alert>();

function getSimulatorCache(): SimulatorCache {
  if (!simulatorCache) {
    const result = createSimulator().run();
    const networkEvents: NetworkEvent[] = [];
    for (const app of result.apps) {
      const scenario = SCENARIO_MAP[app.id] ?? SimulatorScenario.NORMAL;
      const generated = generateEvents(app.id, scenario);
      networkEvents.push(...generated.networkEvents);
    }
    const alerts = result.assessments
      .filter((a) => a.level !== RiskLevel.SAFE)
      .map((assessment) => {
        const app = result.apps.find((ap) => ap.id === assessment.appId);
        const domain =
          assessment.level === RiskLevel.SUSPICIOUS ? 'unknown-upload-server.xyz' : undefined;
        return {
          id: `alert-${assessment.id}`,
          appId: assessment.appId,
          riskAssessmentId: assessment.id,
          title: app?.displayName ?? 'Unknown App',
          message: assessment.explanation,
          level: assessment.level,
          acknowledged: false,
          createdAt: assessment.assessedAt,
          userAction: AlertAction.NONE,
          domain,
        };
      });
    simulatorCache = { result, networkEvents, alerts };
  }
  return simulatorCache;
}

function fromSimulator(): SimulatorResult {
  return getSimulatorCache().result;
}

function simulatorNetworkEvents(): NetworkEvent[] {
  return getSimulatorCache().networkEvents;
}

function simulatorAlerts(): Alert[] {
  const base = getSimulatorCache().alerts;
  return base.map((alert) => simulatorAlertOverrides.get(alert.id) ?? alert);
}

export async function listAppsWithRisk(): Promise<AppWithRisk[]> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    const { apps, assessments } = fromSimulator();
    return apps.map((app) => {
      const assessment = assessments.find((a) => a.appId === app.id);
      return {
        ...app,
        riskLevel: assessment?.level ?? 'SAFE',
        riskScore: assessment?.score ?? 0,
      };
    });
  }

  const rows = await prisma.app.findMany({
    include: {
      riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
    },
  });

  if (rows.length === 0) {
    const { apps, assessments } = fromSimulator();
    return apps.map((app) => {
      const assessment = assessments.find((a) => a.appId === app.id);
      return {
        ...app,
        riskLevel: assessment?.level ?? 'SAFE',
        riskScore: assessment?.score ?? 0,
      };
    });
  }

  return rows.map((row) => ({
    id: row.id,
    packageName: row.packageName,
    displayName: row.displayName,
    category: row.category as App['category'],
    isSystem: row.isSystem,
    trustLevel: row.trustLevel as App['trustLevel'],
    riskLevel: row.riskAssessments[0]?.level ?? 'SAFE',
    riskScore: row.riskAssessments[0]?.score ?? 0,
  }));
}

export async function getAppById(id: string): Promise<{
  app: App;
  assessment?: RiskAssessment;
} | null> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    const { apps, assessments } = fromSimulator();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;
    return { app, assessment: assessments.find((a) => a.appId === id) };
  }

  const row = await prisma.app.findUnique({
    where: { id },
    include: {
      riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
    },
  });

  if (!row) {
    const { apps, assessments } = fromSimulator();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;
    return { app, assessment: assessments.find((a) => a.appId === id) };
  }

  const assessment = row.riskAssessments[0];
  return {
    app: {
      id: row.id,
      packageName: row.packageName,
      displayName: row.displayName,
      category: row.category as App['category'],
      isSystem: row.isSystem,
      trustLevel: row.trustLevel as App['trustLevel'],
    },
    assessment: assessment
      ? {
          id: assessment.id,
          appId: assessment.appId,
          score: assessment.score,
          level: assessment.level as RiskAssessment['level'],
          triggeredRules: assessment.triggeredRules,
          explanation: assessment.explanation,
          assessedAt: assessment.assessedAt,
        }
      : undefined,
  };
}

export async function getDashboardSummary(): Promise<DashboardSummary> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    const { counts, apps, assessments } = fromSimulator();
    return {
      counts,
      totalApps: apps.length,
      recentAlerts: assessments
        .filter((a) => a.level !== 'SAFE')
        .map((a) => {
          const app = apps.find((ap) => ap.id === a.appId);
          return {
            appId: a.appId,
            appName: app?.displayName ?? 'Unknown',
            level: a.level,
            explanation: a.explanation,
            assessedAt: a.assessedAt,
          };
        }),
    };
  }

  const apps = await prisma.app.findMany();
  if (apps.length === 0) {
    const sim = fromSimulator();
    return {
      counts: sim.counts,
      totalApps: sim.apps.length,
      recentAlerts: sim.assessments
        .filter((a) => a.level !== 'SAFE')
        .map((a) => {
          const app = sim.apps.find((ap) => ap.id === a.appId);
          return {
            appId: a.appId,
            appName: app?.displayName ?? 'Unknown',
            level: a.level,
            explanation: a.explanation,
            assessedAt: a.assessedAt,
          };
        }),
    };
  }

  const assessments = await prisma.riskAssessment.findMany({
    orderBy: { assessedAt: 'desc' },
    take: 50,
    include: { app: true },
  });

  const latestByApp = new Map<string, (typeof assessments)[0]>();
  for (const a of assessments) {
    if (!latestByApp.has(a.appId)) latestByApp.set(a.appId, a);
  }

  const counts: RiskCounts = { safe: 0, unusual: 0, suspicious: 0 };
  for (const a of latestByApp.values()) {
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

  return {
    counts,
    totalApps: apps.length,
    recentAlerts: assessments
      .filter((a) => a.level !== 'SAFE')
      .slice(0, 10)
      .map((a) => ({
        appId: a.appId,
        appName: a.app.displayName,
        level: a.level,
        explanation: a.explanation,
        assessedAt: a.assessedAt,
      })),
  };
}

export interface BatchEventInput {
  deviceId: string;
  networkEvents: Array<{
    appPackageName: string;
    domain: string;
    bytesSent: number;
    bytesReceived: number;
    isNewDomain: boolean;
    timestamp: string;
  }>;
}

export async function ingestEventBatch(input: BatchEventInput): Promise<{ accepted: number }> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    return { accepted: input.networkEvents.length };
  }

  let accepted = 0;
  for (const event of input.networkEvents) {
    const app = await prisma.app.findFirst({
      where: { packageName: event.appPackageName, deviceId: input.deviceId },
    });
    if (!app) continue;

    await prisma.networkEvent.create({
      data: {
        appId: app.id,
        domain: event.domain,
        bytesSent: event.bytesSent,
        bytesReceived: event.bytesReceived,
        isNewDomain: event.isNewDomain,
        timestamp: new Date(event.timestamp),
      },
    });
    accepted++;
  }

  return { accepted };
}

export async function listEvents(options: {
  limit: number;
  appId?: string;
}): Promise<NetworkEvent[]> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    let events = simulatorNetworkEvents();
    if (options.appId) {
      events = events.filter((e) => e.appId === options.appId);
    }
    return events.slice(0, options.limit);
  }

  const rows = await prisma.networkEvent.findMany({
    where: options.appId ? { appId: options.appId } : undefined,
    orderBy: { timestamp: 'desc' },
    take: options.limit,
  });

  if (rows.length === 0 && !options.appId) {
    return simulatorNetworkEvents().slice(0, options.limit);
  }

  return rows.map((row) => ({
    id: row.id,
    appId: row.appId,
    domain: row.domain,
    bytesSent: row.bytesSent,
    bytesReceived: row.bytesReceived,
    isNewDomain: row.isNewDomain,
    timestamp: row.timestamp,
  }));
}

export async function getAppEvents(appId: string, limit: number): Promise<NetworkEvent[] | null> {
  const app = await getAppById(appId);
  if (!app) return null;
  return listEvents({ limit, appId });
}

export async function getAppRisk(appId: string): Promise<RiskAssessment | null> {
  const result = await getAppById(appId);
  return result?.assessment ?? null;
}

export async function listAlerts(options?: { acknowledged?: boolean }): Promise<Alert[]> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    let alerts = simulatorAlerts();
    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === options.acknowledged);
    }
    return alerts;
  }

  const rows = await prisma.alert.findMany({
    where: options?.acknowledged !== undefined ? { acknowledged: options.acknowledged } : undefined,
    orderBy: { createdAt: 'desc' },
    include: { app: true },
  });

  if (rows.length === 0) {
    return simulatorAlerts();
  }

  return rows.map((row) => ({
    id: row.id,
    appId: row.appId,
    riskAssessmentId: row.riskAssessmentId,
    title: row.title,
    message: row.message,
    level: row.level as RiskLevel,
    acknowledged: row.acknowledged,
    createdAt: row.createdAt,
    userAction: (row.userAction as AlertAction) ?? AlertAction.NONE,
    domain: row.domain ?? undefined,
  }));
}

export async function getAlertById(id: string): Promise<Alert | null> {
  const alerts = await listAlerts();
  return alerts.find((a) => a.id === id) ?? null;
}

export async function updateAlertAction(
  id: string,
  action: AlertAction,
): Promise<Alert | null> {
  const alert = await getAlertById(id);
  if (!alert) return null;

  const updated: Alert = {
    ...alert,
    userAction: action,
    acknowledged: true,
  };

  if (action === AlertAction.BLOCK && alert.domain) {
    if (await isDatabaseAvailable()) {
      await prisma.blockedDomain.upsert({
        where: { domain: alert.domain },
        create: { domain: alert.domain, source: id },
        update: { source: id },
      });
    }
  }

  if ((await isDatabaseAvailable()) && process.env.DEV_SIMULATOR !== 'true') {
    await prisma.alert.update({
      where: { id },
      data: { userAction: action, acknowledged: true },
    });
  } else if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    simulatorAlertOverrides.set(id, updated);
  }

  return updated;
}
