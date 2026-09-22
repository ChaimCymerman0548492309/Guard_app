import {
  createSimulator,
  generateEvents,
  VIRTUAL_DEVICE_SEEDS,
  DEFAULT_VIRTUAL_DEVICE_ID,
} from '@guardian/simulator';
import type { SimulatorResult } from '@guardian/simulator';
import type {
  Alert,
  App,
  AuthUser,
  DashboardSummary,
  DeviceInfo,
  DeviceSummary,
  DeviceStatus,
  NetworkEvent,
  RiskAssessment,
  RiskCounts,
} from '@guardian/shared';
import { AlertAction, RiskLevel, SimulatorScenario } from '@guardian/shared';
import {
  canAccessOwner,
  deviceWhereForUser,
  isAdmin,
  type AccessContext,
} from './access-control.js';
import {
  getSimulatorAdminUserId,
  getSimulatorCustomerUserId,
} from './auth.js';
import { isDatabaseAvailable, prisma } from './prisma.js';
import type { EventBatchPayload } from './sync-batch-schema.js';
import { canUseDatabaseSync, ingestSyncBatchToDatabase } from './sync-batch-ingest.js';

export type { AccessContext };

export interface AppWithRisk extends App {
  riskLevel: string;
  riskScore: number;
  deviceId?: string;
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

interface SimulatorDeviceState {
  id: string;
  name: string;
  platform: string;
  status: DeviceStatus;
  lastSyncAt: Date | null;
  isVirtual: boolean;
  ownerUserId: string;
}

function defaultOwnerForSeed(seedId: string): string {
  if (seedId === '00000000-0000-4000-8000-000000000003') {
    return getSimulatorAdminUserId();
  }
  return getSimulatorCustomerUserId();
}

function ensureSimulatorDevices(): void {
  if (simulatorDevices.size > 0) return;
  for (const seed of VIRTUAL_DEVICE_SEEDS) {
    simulatorDevices.set(seed.id, {
      id: seed.id,
      name: seed.name,
      platform: seed.platform,
      status: seed.id === DEFAULT_VIRTUAL_DEVICE_ID ? 'online' : 'offline',
      lastSyncAt: seed.id === DEFAULT_VIRTUAL_DEVICE_ID ? new Date() : null,
      isVirtual: true,
      ownerUserId: defaultOwnerForSeed(seed.id),
    });
  }
}

function registerSimulatorDevice(
  deviceId: string,
  ownerUserId: string,
  name?: string,
): SimulatorDeviceState {
  ensureSimulatorDevices();
  const existing = simulatorDevices.get(deviceId);
  if (existing) {
    existing.status = 'online';
    existing.lastSyncAt = new Date();
    return existing;
  }

  const device: SimulatorDeviceState = {
    id: deviceId,
    name: name ?? `Connected Device (${deviceId.slice(0, 8)})`,
    platform: 'android',
    status: 'online',
    lastSyncAt: new Date(),
    isVirtual: false,
    ownerUserId,
  };
  simulatorDevices.set(deviceId, device);
  return device;
}

function listSimulatorDevicesForUser(user: AuthUser): SimulatorDeviceState[] {
  ensureSimulatorDevices();
  const devices = [...simulatorDevices.values()];
  if (isAdmin(user)) return devices;
  return devices.filter((device) => device.ownerUserId === user.id);
}

async function getDeviceOwnerId(deviceId: string): Promise<string | null> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    ensureSimulatorDevices();
    return simulatorDevices.get(deviceId)?.ownerUserId ?? null;
  }
  const row = await prisma.device.findUnique({ where: { id: deviceId }, select: { userId: true } });
  return row?.userId ?? null;
}

export async function assertDeviceAccess(deviceId: string, ctx: AccessContext): Promise<boolean> {
  const ownerId = await getDeviceOwnerId(deviceId);
  if (!ownerId) return false;
  return canAccessOwner(ownerId, ctx.user);
}

let simulatorCache: SimulatorCache | null = null;
const simulatorAlertOverrides = new Map<string, Alert>();
const simulatorBatchEvents: NetworkEvent[] = [];
const simulatorDevices = new Map<string, SimulatorDeviceState>();

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
    ensureSimulatorDevices();
  }
  return simulatorCache;
}

function fromSimulator(): SimulatorResult {
  return getSimulatorCache().result;
}

function simulatorNetworkEvents(): NetworkEvent[] {
  return [...getSimulatorCache().networkEvents, ...simulatorBatchEvents];
}

function simulatorAlerts(): Alert[] {
  const base = getSimulatorCache().alerts;
  return base.map((alert) => simulatorAlertOverrides.get(alert.id) ?? alert);
}

function buildDeviceInfo(state: SimulatorDeviceState): DeviceInfo {
  const { counts, apps } = fromSimulator();
  return {
    id: state.id,
    name: state.name,
    platform: state.platform,
    status: state.status,
    lastSyncAt: state.lastSyncAt,
    appCount: apps.length,
    riskCounts: counts,
    isVirtual: state.isVirtual,
  };
}

function buildRecentAlerts(deviceId?: string) {
  const { apps, assessments } = fromSimulator();
  return assessments
    .filter((a) => a.level !== 'SAFE')
    .map((a) => {
      const app = apps.find((ap) => ap.id === a.appId);
      const device = deviceId ? simulatorDevices.get(deviceId) : undefined;
      return {
        appId: a.appId,
        appName: app?.displayName ?? 'Unknown',
        level: a.level,
        explanation: a.explanation,
        assessedAt: a.assessedAt,
        deviceId: device?.id,
        deviceName: device?.name,
      };
    });
}

export async function listDevices(ctx: AccessContext): Promise<DeviceInfo[]> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    return listSimulatorDevicesForUser(ctx.user)
      .map(buildDeviceInfo)
      .sort((a, b) => {
        const aTime = a.lastSyncAt?.getTime() ?? 0;
        const bTime = b.lastSyncAt?.getTime() ?? 0;
        return bTime - aTime;
      });
  }

  const rows = await prisma.device.findMany({
    where: deviceWhereForUser(ctx.user),
    include: {
      apps: {
        include: {
          riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (rows.length === 0) {
    return [];
  }

  return rows.map((row) => {
    const counts: RiskCounts = { safe: 0, unusual: 0, suspicious: 0 };
    for (const app of row.apps) {
      const level = app.riskAssessments[0]?.level ?? 'SAFE';
      switch (level) {
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
      id: row.id,
      name: row.name,
      platform: row.platform,
      status: 'online' as DeviceStatus,
      lastSyncAt: row.updatedAt,
      appCount: row.apps.length,
      riskCounts: counts,
      isVirtual: false,
    };
  });
}

export async function getDeviceById(id: string, ctx: AccessContext): Promise<DeviceInfo | null> {
  const devices = await listDevices(ctx);
  return devices.find((device) => device.id === id) ?? null;
}

export async function getDeviceSummary(
  id: string,
  ctx: AccessContext,
): Promise<DeviceSummary | null> {
  const device = await getDeviceById(id, ctx);
  if (!device) return null;

  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    return {
      ...device,
      recentAlerts: buildRecentAlerts(id).slice(0, 10),
    };
  }

  const alertRows = await prisma.alert.findMany({
    where: { app: { deviceId: id } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { app: true },
  });

  return {
    ...device,
    recentAlerts: alertRows.map((row) => ({
      appId: row.appId,
      appName: row.app.displayName,
      level: row.level,
      explanation: row.message,
      assessedAt: row.createdAt,
    })),
  };
}

export async function registerDevice(
  input: {
    id: string;
    name?: string;
    platform?: string;
  },
  ctx: AccessContext,
): Promise<DeviceInfo> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    const state = registerSimulatorDevice(input.id, ctx.user.id, input.name);
    if (input.platform) state.platform = input.platform;
    return buildDeviceInfo(state);
  }

  const device = await prisma.device.upsert({
    where: { id: input.id },
    create: {
      id: input.id,
      name: input.name ?? `Device ${input.id.slice(0, 8)}`,
      platform: input.platform ?? 'android',
      userId: ctx.user.id,
    },
    update: {
      name: input.name ?? undefined,
      platform: input.platform ?? undefined,
      userId: ctx.user.id,
    },
  });

  return {
    id: device.id,
    name: device.name,
    platform: device.platform,
    status: 'online',
    lastSyncAt: device.updatedAt,
    appCount: 0,
    riskCounts: { safe: 0, unusual: 0, suspicious: 0 },
    isVirtual: false,
  };
}

export async function listAppsWithRisk(
  ctx: AccessContext,
  deviceId?: string,
): Promise<AppWithRisk[]> {
  if (deviceId && !(await assertDeviceAccess(deviceId, ctx))) {
    return [];
  }
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    if (deviceId) {
      await getDeviceById(deviceId, ctx);
    }
    const { apps, assessments } = fromSimulator();
    const resolvedDeviceId = deviceId ?? DEFAULT_VIRTUAL_DEVICE_ID;
    return apps.map((app) => {
      const assessment = assessments.find((a) => a.appId === app.id);
      return {
        ...app,
        deviceId: resolvedDeviceId,
        riskLevel: assessment?.level ?? 'SAFE',
        riskScore: assessment?.score ?? 0,
      };
    });
  }

  const rows = await prisma.app.findMany({
    where: {
      ...(deviceId ? { deviceId } : {}),
      ...(isAdmin(ctx.user) ? {} : { device: { userId: ctx.user.id } }),
    },
    include: {
      riskAssessments: { orderBy: { assessedAt: 'desc' }, take: 1 },
    },
  });

  if (rows.length === 0) {
    if (process.env.DEV_SIMULATOR === 'true') {
      const { apps, assessments } = fromSimulator();
      return apps.map((app) => {
        const assessment = assessments.find((a) => a.appId === app.id);
        return {
          ...app,
          deviceId: deviceId ?? DEFAULT_VIRTUAL_DEVICE_ID,
          riskLevel: assessment?.level ?? 'SAFE',
          riskScore: assessment?.score ?? 0,
        };
      });
    }
    return [];
  }

  return rows.map((row) => ({
    id: row.id,
    packageName: row.packageName,
    displayName: row.displayName,
    category: row.category as App['category'],
    isSystem: row.isSystem,
    trustLevel: row.trustLevel as App['trustLevel'],
    deviceId: row.deviceId,
    riskLevel: row.riskAssessments[0]?.level ?? 'SAFE',
    riskScore: row.riskAssessments[0]?.score ?? 0,
  }));
}

export async function getAppById(
  id: string,
  ctx: AccessContext,
): Promise<{
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
      device: true,
    },
  });

  if (!row) {
    const { apps, assessments } = fromSimulator();
    const app = apps.find((a) => a.id === id);
    if (!app) return null;
    return { app, assessment: assessments.find((a) => a.appId === id) };
  }

  if (!canAccessOwner(row.device.userId, ctx.user)) {
    return null;
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

export async function getDashboardSummary(ctx: AccessContext): Promise<DashboardSummary> {
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    const devices = await listDevices(ctx);
    const { counts, apps } = fromSimulator();
    return {
      counts,
      totalApps: apps.length,
      totalDevices: devices.length,
      recentAlerts: buildRecentAlerts(),
    };
  }

  const apps = await prisma.app.findMany({
    where: isAdmin(ctx.user) ? undefined : { device: { userId: ctx.user.id } },
  });
  const devices = await listDevices(ctx);
  if (apps.length === 0) {
    if (process.env.DEV_SIMULATOR === 'true') {
      const sim = fromSimulator();
      return {
        counts: sim.counts,
        totalApps: sim.apps.length,
        totalDevices: devices.length,
        recentAlerts: buildRecentAlerts(),
      };
    }
    return {
      counts: { safe: 0, unusual: 0, suspicious: 0 },
      totalApps: 0,
      totalDevices: devices.length,
      recentAlerts: [],
    };
  }

  const assessments = await prisma.riskAssessment.findMany({
    orderBy: { assessedAt: 'desc' },
    take: 500,
    include: { app: { include: { device: true } } },
    where: isAdmin(ctx.user) ? undefined : { app: { device: { userId: ctx.user.id } } },
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

  const alertRows = await prisma.alert.findMany({
    where: isAdmin(ctx.user) ? undefined : { app: { device: { userId: ctx.user.id } } },
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: { app: { include: { device: true } } },
  });

  return {
    counts,
    totalApps: apps.length,
    totalDevices: devices.length,
    recentAlerts: alertRows.map((row) => ({
      appId: row.appId,
      appName: row.app.displayName,
      level: row.level,
      explanation: row.message,
      assessedAt: row.createdAt,
      deviceId: row.app.deviceId,
      deviceName: row.app.device.name,
    })),
  };
}

export type { EventBatchPayload } from './sync-batch-schema.js';

export interface SyncBatchResult {
  accepted: number;
  acceptedEventIds: string[];
  appsUpserted?: number;
  assessmentsUpserted?: number;
  alertsUpserted?: number;
}

export async function ingestEventBatch(
  input: EventBatchPayload,
  ctx: AccessContext,
): Promise<SyncBatchResult> {
  const ownerId = await getDeviceOwnerId(input.deviceId);
  if (ownerId && !canAccessOwner(ownerId, ctx.user)) {
    return { accepted: 0, acceptedEventIds: [] };
  }

  if (!(await canUseDatabaseSync())) {
    registerSimulatorDevice(input.deviceId, ctx.user.id, input.deviceName);
    const acceptedEventIds: string[] = [];
    for (const event of input.networkEvents) {
      simulatorBatchEvents.push({
        id: event.clientEventId,
        appId: `pkg-${event.appPackageName}`,
        domain: event.domain,
        bytesSent: event.bytesSent,
        bytesReceived: event.bytesReceived,
        isNewDomain: event.isNewDomain,
        timestamp: new Date(event.timestamp),
      });
      acceptedEventIds.push(event.clientEventId);
    }
    return { accepted: acceptedEventIds.length, acceptedEventIds };
  }

  return ingestSyncBatchToDatabase(input, ctx, getDeviceOwnerId);
}

export async function runDeviceDemoScenario(
  deviceId: string,
  ctx: AccessContext,
): Promise<{ ok: true } | null> {
  const device = await getDeviceById(deviceId, ctx);
  if (!device) return null;

  registerSimulatorDevice(deviceId, ctx.user.id, device.name);

  const { networkEvents } = generateEvents('app-photo-editor', SimulatorScenario.HIGH_RISK);

  for (const event of networkEvents) {
    simulatorBatchEvents.push({
      ...event,
      id: `demo-${deviceId}-${simulatorBatchEvents.length}`,
      timestamp: new Date(),
    });
  }

  const { assessments, apps } = fromSimulator();
  const photoAssessment = assessments.find((a) => a.appId === 'app-photo-editor');
  if (photoAssessment) {
    const app = apps.find((a) => a.id === 'app-photo-editor');
    const alertId = `alert-${photoAssessment.id}`;
    simulatorAlertOverrides.delete(alertId);
    const alert: Alert = {
      id: alertId,
      appId: photoAssessment.appId,
      riskAssessmentId: photoAssessment.id,
      title: app?.displayName ?? 'Photo Editor',
      message: photoAssessment.explanation,
      level: photoAssessment.level,
      acknowledged: false,
      createdAt: new Date(),
      userAction: AlertAction.NONE,
      domain: 'unknown-upload-server.xyz',
    };
    simulatorAlertOverrides.set(alertId, alert);
  }

  const state = simulatorDevices.get(deviceId);
  if (state) {
    state.status = 'online';
    state.lastSyncAt = new Date();
  }

  return { ok: true };
}

export async function listEvents(
  ctx: AccessContext,
  options: {
  limit: number;
  appId?: string;
  deviceId?: string;
},
): Promise<NetworkEvent[]> {
  if (options.deviceId && !(await assertDeviceAccess(options.deviceId, ctx))) {
    return [];
  }
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    if (options.deviceId) {
      await getDeviceById(options.deviceId, ctx);
    }
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

export async function getAppEvents(
  appId: string,
  limit: number,
  ctx: AccessContext,
): Promise<NetworkEvent[] | null> {
  const app = await getAppById(appId, ctx);
  if (!app) return null;
  return listEvents(ctx, { limit, appId });
}

export async function getAppRisk(appId: string, ctx: AccessContext): Promise<RiskAssessment | null> {
  const result = await getAppById(appId, ctx);
  return result?.assessment ?? null;
}

export async function listAlerts(
  ctx: AccessContext,
  options?: {
  acknowledged?: boolean;
  deviceId?: string;
},
): Promise<Alert[]> {
  if (options?.deviceId && !(await assertDeviceAccess(options.deviceId, ctx))) {
    return [];
  }
  if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
    if (options?.deviceId) {
      await getDeviceById(options.deviceId, ctx);
    }
    let alerts = simulatorAlerts();
    if (options?.acknowledged !== undefined) {
      alerts = alerts.filter((a) => a.acknowledged === options.acknowledged);
    }
    return alerts;
  }

  const rows = await prisma.alert.findMany({
    where: {
      ...(options?.deviceId ? { app: { deviceId: options.deviceId } } : {}),
      ...(isAdmin(ctx.user) ? {} : { app: { device: { userId: ctx.user.id } } }),
      ...(options?.acknowledged !== undefined ? { acknowledged: options.acknowledged } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: { app: true },
  });

  if (rows.length === 0) {
    if (process.env.DEV_SIMULATOR === 'true' || !(await isDatabaseAvailable())) {
      let alerts = simulatorAlerts();
      if (options?.acknowledged !== undefined) {
        alerts = alerts.filter((a) => a.acknowledged === options.acknowledged);
      }
      return alerts;
    }
    return [];
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

export async function getAlertById(id: string, ctx: AccessContext): Promise<Alert | null> {
  const alerts = await listAlerts(ctx);
  return alerts.find((a) => a.id === id) ?? null;
}

export async function updateAlertAction(
  id: string,
  action: AlertAction,
  ctx: AccessContext,
): Promise<Alert | null> {
  const alert = await getAlertById(id, ctx);
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
