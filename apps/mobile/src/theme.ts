import { RISK_LEVEL_COLORS } from '@guardian/shared';
import type { RiskLevel } from '@guardian/shared';

export const colors = {
  primary: '#1e3a5f',
  background: '#f8fafc',
  card: '#ffffff',
  text: '#1e293b',
  textSecondary: '#64748b',
  border: '#e2e8f0',
  white: '#ffffff',
};

export function getRiskColor(level: RiskLevel): string {
  return RISK_LEVEL_COLORS[level];
}
