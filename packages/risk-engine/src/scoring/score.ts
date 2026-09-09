import { RiskLevel } from '@guardian/shared';
import type { RuleResult } from '../types.js';

const SAFE_MAX = 29;
const UNUSUAL_MAX = 69;

export function calculateScore(results: RuleResult[]): number {
  const triggered = results.filter((r) => r.triggered);
  const raw = triggered.reduce((sum, r) => sum + r.weight, 0);
  return Math.min(100, raw);
}

export function scoreToLevel(score: number): RiskLevel {
  if (score <= SAFE_MAX) return RiskLevel.SAFE;
  if (score <= UNUSUAL_MAX) return RiskLevel.UNUSUAL;
  return RiskLevel.SUSPICIOUS;
}
