import { getRiskBadgeColor, getRiskBadgeLabel } from '@guardian/ui';
import type { RiskLevel } from '@guardian/shared';
import { riskLabel } from '../api';
import type { Locale } from '../i18n';

interface RiskBadgeProps {
  level: RiskLevel | string;
  locale: Locale;
}

export function RiskBadge({ level, locale }: RiskBadgeProps) {
  const normalized = level as RiskLevel;
  const color = getRiskBadgeColor(normalized) ?? '#64748b';
  const label = locale === 'en' ? getRiskBadgeLabel(normalized) : riskLabel(level, locale);

  return (
    <span className="risk-badge" style={{ backgroundColor: `${color}22`, color, borderColor: color }}>
      {label}
    </span>
  );
}
