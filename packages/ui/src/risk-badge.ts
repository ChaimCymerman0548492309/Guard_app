import { RISK_LEVEL_COLORS, RISK_LEVEL_LABELS } from '@guardian/shared';
import type { RiskLevel } from '@guardian/shared';

export interface RiskBadgeProps {
  level: RiskLevel;
}

export function getRiskBadgeColor(level: RiskLevel): string {
  return RISK_LEVEL_COLORS[level];
}

export function getRiskBadgeLabel(level: RiskLevel): string {
  return RISK_LEVEL_LABELS[level];
}
