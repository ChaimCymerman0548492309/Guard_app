import { Link } from 'react-router-dom';
import type { DeviceInfo } from '@guardian/shared';
import { formatDate } from '../api';
import type { Locale } from '../i18n';
import { t } from '../i18n';
import { RiskBadge } from './RiskBadge';
import { RiskLevel } from '@guardian/shared';

interface DeviceCardProps {
  device: DeviceInfo;
  locale: Locale;
}

function statusLabel(status: DeviceInfo['status'], locale: Locale): string {
  if (status === 'online') return t(locale, 'statusOnline');
  if (status === 'syncing') return t(locale, 'statusSyncing');
  return t(locale, 'statusOffline');
}

export function DeviceCard({ device, locale }: DeviceCardProps) {
  return (
    <article className={`device-card status-${device.status}`}>
      <div className="device-card-header">
        <div>
          <h2>{device.name}</h2>
          <p className="muted">
            {device.isVirtual ? t(locale, 'virtualDevice') : t(locale, 'connectedDevice')} ·{' '}
            {device.platform}
          </p>
        </div>
        <span className={`status-pill status-${device.status}`}>{statusLabel(device.status, locale)}</span>
      </div>

      <div className="stats-row">
        <div>
          <strong>{device.appCount}</strong>
          <span>{t(locale, 'totalApps')}</span>
        </div>
        <div>
          <strong>{device.riskCounts.suspicious}</strong>
          <span>{t(locale, 'suspicious')}</span>
        </div>
        <div>
          <strong>{device.riskCounts.unusual}</strong>
          <span>{t(locale, 'unusual')}</span>
        </div>
      </div>

      <p className="muted">{t(locale, 'lastSync')}: {formatDate(device.lastSyncAt, locale)}</p>

      {device.riskCounts.suspicious > 0 && (
        <div className="device-alert-banner">
          <RiskBadge level={RiskLevel.SUSPICIOUS} locale={locale} />
          <span>{device.riskCounts.suspicious} {t(locale, 'suspicious').toLowerCase()}</span>
        </div>
      )}

      <Link className="button primary" to={`/devices/${device.id}`}>
        {t(locale, 'viewDevice')}
      </Link>
    </article>
  );
}
