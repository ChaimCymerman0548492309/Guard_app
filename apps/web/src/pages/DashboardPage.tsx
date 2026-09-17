import { useCallback, useEffect, useState } from 'react';
import type { DashboardSummary, DeviceInfo } from '@guardian/shared';
import { getDashboardSummary, listDevices } from '../api';
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

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [deviceList, dashboard] = await Promise.all([listDevices(), getDashboardSummary()]);
      setDevices(deviceList);
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
      <section className="banner">{t(locale, 'demoMode')}</section>
      <p className="hint">{t(locale, 'emulatorHint')}</p>

      {loading && <p>{t(locale, 'loading')}</p>}
      {error && <p className="error">{error}</p>}

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
