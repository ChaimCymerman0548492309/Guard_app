import type { AccessContext } from './access-control.js';
import { canAccessOwner } from './access-control.js';
import { isDatabaseAvailable, prisma } from './prisma.js';
import type { EventBatchPayload } from './sync-batch-schema.js';

import type { z } from 'zod';
import type { syncAppSchema } from './sync-batch-schema.js';

type SyncApp = z.infer<typeof syncAppSchema>;

function normalizeTrustLevel(trust: string): string {
  if (trust === 'TRUSTED' || trust === 'NEUTRAL' || trust === 'UNKNOWN') {
    return trust;
  }
  return 'NEUTRAL';
}

async function upsertSyncedApp(deviceId: string, app: SyncApp): Promise<{ id: string; packageName: string }> {
  const row = await prisma.app.upsert({
    where: {
      deviceId_packageName: { deviceId, packageName: app.packageName },
    },
    create: {
      deviceId,
      packageName: app.packageName,
      displayName: app.displayName,
      category: app.category,
      isSystem: app.isSystem,
      trustLevel: normalizeTrustLevel(app.trustLevel),
    },
    update: {
      displayName: app.displayName,
      category: app.category,
      isSystem: app.isSystem,
      trustLevel: normalizeTrustLevel(app.trustLevel),
    },
  });
  return { id: row.id, packageName: row.packageName };
}

async function resolveAppId(
  deviceId: string,
  packageName: string,
  packageToAppId: Map<string, string>,
): Promise<string | null> {
  const cached = packageToAppId.get(packageName);
  if (cached) return cached;

  const existing = await prisma.app.findFirst({
    where: { deviceId, packageName },
    select: { id: true },
  });
  if (existing) {
    packageToAppId.set(packageName, existing.id);
    return existing.id;
  }

  const label = packageName.split('.').pop() ?? packageName;
  const created = await upsertSyncedApp(deviceId, {
    packageName,
    displayName: label,
    category: 'UNKNOWN',
    isSystem: false,
    trustLevel: 'UNKNOWN',
  });
  packageToAppId.set(packageName, created.id);
  return created.id;
}

export async function ingestSyncBatchToDatabase(
  input: EventBatchPayload,
  ctx: AccessContext,
  getDeviceOwnerId: (deviceId: string) => Promise<string | null>,
): Promise<{
  accepted: number;
  acceptedEventIds: string[];
  appsUpserted: number;
  assessmentsUpserted: number;
  alertsUpserted: number;
}> {
  const ownerId = await getDeviceOwnerId(input.deviceId);
  if (ownerId && !canAccessOwner(ownerId, ctx.user)) {
    return {
      accepted: 0,
      acceptedEventIds: [],
      appsUpserted: 0,
      assessmentsUpserted: 0,
      alertsUpserted: 0,
    };
  }

  if (!ownerId) {
    await prisma.device.upsert({
      where: { id: input.deviceId },
      create: {
        id: input.deviceId,
        userId: ctx.user.id,
        name: input.deviceName ?? `Device ${input.deviceId.slice(0, 8)}`,
        platform: input.platform ?? 'android',
      },
      update: {
        userId: ctx.user.id,
        ...(input.deviceName ? { name: input.deviceName } : {}),
        ...(input.platform ? { platform: input.platform } : {}),
      },
    });
  } else if (input.deviceName || input.platform) {
    await prisma.device.update({
      where: { id: input.deviceId },
      data: {
        ...(input.deviceName ? { name: input.deviceName } : {}),
        ...(input.platform ? { platform: input.platform } : {}),
      },
    });
  }

  const packageToAppId = new Map<string, string>();
  let appsUpserted = 0;

  for (const app of input.apps ?? []) {
    const row = await upsertSyncedApp(input.deviceId, app);
    packageToAppId.set(row.packageName, row.id);
    appsUpserted++;
  }

  let assessmentsUpserted = 0;
  for (const assessment of input.assessments ?? []) {
    const appId = await resolveAppId(input.deviceId, assessment.packageName, packageToAppId);
    if (!appId) continue;

    await prisma.riskAssessment.upsert({
      where: { id: assessment.id },
      create: {
        id: assessment.id,
        appId,
        score: assessment.score,
        level: assessment.level,
        triggeredRules: assessment.triggeredRules,
        explanation: assessment.explanation,
        assessedAt: new Date(assessment.assessedAt),
      },
      update: {
        score: assessment.score,
        level: assessment.level,
        triggeredRules: assessment.triggeredRules,
        explanation: assessment.explanation,
        assessedAt: new Date(assessment.assessedAt),
      },
    });
    assessmentsUpserted++;
  }

  let alertsUpserted = 0;
  for (const alert of input.alerts ?? []) {
    const appId = await resolveAppId(input.deviceId, alert.packageName, packageToAppId);
    if (!appId) continue;

    await prisma.riskAssessment.upsert({
      where: { id: alert.riskAssessmentId },
      create: {
        id: alert.riskAssessmentId,
        appId,
        score: 0,
        level: alert.level,
        triggeredRules: [],
        explanation: alert.message,
        assessedAt: new Date(alert.createdAt),
      },
      update: {},
    });

    await prisma.alert.upsert({
      where: { id: alert.id },
      create: {
        id: alert.id,
        appId,
        riskAssessmentId: alert.riskAssessmentId,
        title: alert.title,
        message: alert.message,
        level: alert.level,
        acknowledged: alert.acknowledged,
        userAction: alert.userAction ?? 'NONE',
        domain: alert.domain,
        createdAt: new Date(alert.createdAt),
      },
      update: {
        title: alert.title,
        message: alert.message,
        level: alert.level,
        acknowledged: alert.acknowledged,
        userAction: alert.userAction ?? 'NONE',
        domain: alert.domain,
      },
    });
    alertsUpserted++;
  }

  const acceptedEventIds: string[] = [];
  for (const event of input.networkEvents) {
    const appId = await resolveAppId(input.deviceId, event.appPackageName, packageToAppId);
    if (!appId) continue;

    await prisma.networkEvent.create({
      data: {
        appId,
        domain: event.domain,
        bytesSent: event.bytesSent,
        bytesReceived: event.bytesReceived,
        isNewDomain: event.isNewDomain,
        timestamp: new Date(event.timestamp),
      },
    });
    acceptedEventIds.push(event.clientEventId);
  }

  await prisma.device.update({
    where: { id: input.deviceId },
    data: { updatedAt: new Date() },
  });

  return {
    accepted: acceptedEventIds.length,
    acceptedEventIds,
    appsUpserted,
    assessmentsUpserted,
    alertsUpserted,
  };
}

export async function canUseDatabaseSync(): Promise<boolean> {
  return process.env.DEV_SIMULATOR !== 'true' && (await isDatabaseAvailable());
}
