import { RiskLevel, TrustLevel } from '@guardian/shared';
import type { RuleResult } from '../types.js';
const SAFE_MAX = 29, UNUSUAL_MAX = 69;
export function calculateScore(results: RuleResult[], trustLevel?: TrustLevel): number {
  const raw = results.filter((r) => r.triggered).reduce((s, r) => s + r.weight, 0);
  const m = trustLevel === TrustLevel.TRUSTED ? 0.5 : 1;
  return Math.min(100, Math.round(raw * m));
}
export function scoreToLevel(score: number): RiskLevel {
  if (score <= SAFE_MAX) return RiskLevel.SAFE;
  if (score <= UNUSUAL_MAX) return RiskLevel.UNUSUAL;
  return RiskLevel.SUSPICIOUS;
}
