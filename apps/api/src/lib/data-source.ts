import { createSimulator } from '@guardian/simulator';
import type { SimulatorResult } from '@guardian/simulator';
import type { App, RiskAssessment, RiskCounts } from '@guardian/shared';
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

function fromSimulator(): SimulatorResult {
  return createSimulator().run();
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
