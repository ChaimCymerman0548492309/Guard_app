import type { RuleResult } from '../types.js';
import { RiskLevel } from '@guardian/shared';

const LEVEL_INTROS: Record<RiskLevel, string> = {
  [RiskLevel.SAFE]: 'This app appears to be behaving normally.',
  [RiskLevel.UNUSUAL]: 'This app showed some unusual activity.',
  [RiskLevel.SUSPICIOUS]: 'This app showed concerning activity that needs your attention.',
};

export function buildExplanation(level: RiskLevel, results: RuleResult[]): string {
  const triggered = results.filter((r) => r.triggered);
  if (triggered.length === 0) {
    return LEVEL_INTROS[RiskLevel.SAFE];
  }

  const reasons = triggered.map((r) => r.reason).join('; ');
  return `${LEVEL_INTROS[level]} ${reasons}.`;
}
