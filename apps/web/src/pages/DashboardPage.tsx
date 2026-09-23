import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummary, DeviceInfo } from '@guardian/shared';
import { getDashboardSummary, listDevices } from '../api';
import { apiUrl } from '../api-base';
import { DeviceCard } from '../components/DeviceCard';
import { Layout } from '../components/Layout';
import { RiskBadge } from '../components/RiskBadge';
import type { Locale } from '../i18n';
import { t } from '../i18n';

interface DashboardPageProps {
  locale: Locale;
  onToggleLocale: () => void;
}

export function DashboardPage({ locale, onToggleLocale }: DashboardPageProps) {
  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dbDegraded, setDbDegraded] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setDbDegraded(false);
    try {
      const healthRes = await fetch(apiUrl('/health'));
      if (healthRes.ok) {
        const health = (await healthRes.json()) as {
          data?: { mode?: string; database?: { connected?: boolean } };
        };
        if (health.data?.mode === 'real' && health.data.database?.connected === false) {
          setDbDegraded(true);
        }
      }

      const [deviceList, dashboard] = await Promise.all([listDevices(), getDashboardSummary()]);
      setDevices(deviceList.filter((d) => !d.isVirtual));
      setSummary(dashboard);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'error'));
    } finally {
      setLoading(false);
    }
  }, [locale]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <Layout locale={locale} onToggleLocale={onToggleLocale} onRefresh={() => void load()}>
      {loading && <p>{t(locale, 'loading')}</p>}
      {error && <p className="error">{error}</p>}
      {dbDegraded && !error && (
        <p className="error" role="alert">
          {t(locale, 'serviceUnavailable')}
        </p>
      )}

      <p className="banner scenario-banner">{t(locale, 'alertScenario')}</p>

      {summary && (
        <section className="summary-grid">
          <div className="summary-card">
            <strong>{summary.totalDevices}</strong>
            <span>{t(locale, 'devices')}</span>
          </div>
          <div className="summary-card">
            <strong>{summary.totalApps}</strong>
            <span>{t(locale, 'totalApps')}</span>
          </div>
          <div className="summary-card safe">
            <strong>{summary.counts.safe}</strong>
            <span>{t(locale, 'safe')}</span>
          </div>
          <div className="summary-card unusual">
            <strong>{summary.counts.unusual}</strong>
            <span>{t(locale, 'unusual')}</span>
          </div>
          <div className="summary-card suspicious">
            <strong>{summary.counts.suspicious}</strong>
            <span>{t(locale, 'suspicious')}</span>
          </div>
        </section>
      )}

      {!loading && !error && devices.length === 0 && (
        <section className="panel empty-state" role="status">
          <h2>{t(locale, 'noDevices')}</h2>
          <p className="muted">{t(locale, 'noDevicesHint')}</p>
        </section>
      )}

      <section className="devices-grid">
        {devices.map((device) => (
          <DeviceCard key={device.id} device={device} locale={locale} />
        ))}
      </section>

      {summary && summary.recentAlerts.length > 0 && (
        <section className="panel">
          <h2>{t(locale, 'recentAlerts')}</h2>
          <ul className="alert-list">
            {summary.recentAlerts.map((alert) => (
              <li key={`${alert.appId}-${alert.assessedAt}`}>
                <div>
                  <strong>{alert.appName}</strong>
                  <p>{alert.explanation}</p>
                </div>
                <RiskBadge level={alert.level} locale={locale} />
              </li>
            ))}
          </ul>
        </section>
      )}
    </Layout>
  );
}
