import { z } from 'zod';

export const syncAppSchema = z.object({
  packageName: z.string().min(1),
  displayName: z.string().min(1),
  category: z.string().min(1),
  isSystem: z.boolean(),
  trustLevel: z.string().min(1),
});

export const syncAssessmentSchema = z.object({
  id: z.string().uuid(),
  packageName: z.string().min(1),
  score: z.number().int().min(0).max(100),
  level: z.string().min(1),
  triggeredRules: z.array(z.string()),
  explanation: z.string(),
  assessedAt: z.string().datetime(),
});

export const syncAlertSchema = z.object({
  id: z.string().min(1),
  packageName: z.string().min(1),
  riskAssessmentId: z.string().min(1),
  title: z.string().min(1),
  message: z.string().min(1),
  level: z.string().min(1),
  acknowledged: z.boolean(),
  userAction: z.string().optional(),
  domain: z.string().optional(),
  createdAt: z.string().datetime(),
});

export const syncNetworkEventSchema = z.object({
  clientEventId: z.string().min(1),
  appPackageName: z.string().min(1),
  domain: z.string().min(1),
  bytesSent: z.number().int().nonnegative(),
  bytesReceived: z.number().int().nonnegative(),
  isNewDomain: z.boolean(),
  timestamp: z.string().datetime(),
});

export const eventBatchSchema = z.object({
  deviceId: z.string().uuid(),
  deviceName: z.string().min(1).max(120).optional(),
  platform: z.string().min(1).max(32).optional(),
  apps: z.array(syncAppSchema).max(500).optional(),
  assessments: z.array(syncAssessmentSchema).max(500).optional(),
  alerts: z.array(syncAlertSchema).max(200).optional(),
  networkEvents: z.array(syncNetworkEventSchema).max(500),
});

export type EventBatchPayload = z.infer<typeof eventBatchSchema>;
