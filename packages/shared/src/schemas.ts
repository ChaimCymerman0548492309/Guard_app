import { z } from 'zod';
import { AppCategory, RiskLevel, SecurityEventType, TrustLevel } from './enums.js';

export const appSchema = z.object({
  id: z.string().uuid(),
  packageName: z.string().min(1),
  displayName: z.string().min(1),
  category: z.nativeEnum(AppCategory),
  isSystem: z.boolean(),
  trustLevel: z.nativeEnum(TrustLevel),
  iconUrl: z.string().url().optional(),
});

export const securityEventSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().uuid(),
  type: z.nativeEnum(SecurityEventType),
  timestamp: z.coerce.date(),
  metadata: z.record(z.unknown()),
});

export const networkEventSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().uuid(),
  domain: z.string().min(1),
  bytesSent: z.number().int().nonnegative(),
  bytesReceived: z.number().int().nonnegative(),
  isNewDomain: z.boolean(),
  timestamp: z.coerce.date(),
});

export const riskAssessmentSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().uuid(),
  score: z.number().min(0).max(100),
  level: z.nativeEnum(RiskLevel),
  triggeredRules: z.array(z.string()),
  explanation: z.string(),
  assessedAt: z.coerce.date(),
});

export const alertSchema = z.object({
  id: z.string().uuid(),
  appId: z.string().uuid(),
  riskAssessmentId: z.string().uuid(),
  title: z.string().min(1),
  message: z.string().min(1),
  level: z.nativeEnum(RiskLevel),
  acknowledged: z.boolean(),
  createdAt: z.coerce.date(),
});

export const riskCountsSchema = z.object({
  safe: z.number().int().nonnegative(),
  unusual: z.number().int().nonnegative(),
  suspicious: z.number().int().nonnegative(),
});
