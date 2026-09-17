import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Alert, DeviceSummary } from '@guardian/shared';
import {
  alertAction,
  getDeviceSummary,
  listDeviceAlerts,
  listDeviceApps,
  runDeviceDemo,
  type AppWithRisk,
} from '../api';
import { Layout } from '../components/Layout';
import { RiskBadge } from '../components/RiskBadge';
import type { Locale } from '../i18n';
import { t } from '../i18n';
import { formatDate } from '../api';

interface DevicePageProps {
  locale: Locale;
  onToggleLocale: () => void;
}

export function DevicePage({ locale, onToggleLocale }: DevicePageProps) {
  const { deviceId = '' } = useParams();
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [apps, setApps] = useState<AppWithRisk[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [demoRunning, setDemoRunning] = useState(false);

  const load = useCallback(async () => {
    if (!deviceId) return;
    setLoading(true);
    setError(null);
    try {
      const [summary, appList, alertList] = await Promise.all([
        getDeviceSummary(deviceId),
        listDeviceApps(deviceId),
        listDeviceAlerts(deviceId, false),
      ]);
      setDevice(summary);
      setApps(appList);
      setAlerts(alertList);
    } catch (err) {
      setError(err instanceof Error ? err.message : t(locale, 'error'));
    } finally {
      setLoading(false);
    }
  }, [deviceId, locale]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDemo() {
    if (!deviceId) return;
    setDemoRunning(true);
    try {
      await runDeviceDemo(deviceId);
      await load();
    } finally {
      setDemoRunning(false);
    }
  }

  async function handleAlertAction(alertId: string, action: 'block' | 'allow' | 'ignore') {
    await alertAction(alertId, action);
    await load();
  }

  return (
    <Layout locale={locale} onToggleLocale={onToggleLocale} onRefresh={() => void load()}>
      <Link className="back-link" to="/">
        ← {t(locale, 'back')}
      </Link>

      {loading && <p>{t(locale, 'loading')}</p>}
      {error && <p className="error">{error}</p>}

      {device && (
        <>
          <section className="panel device-header">
            <div>
              <h1>{device.name}</h1>
              <p className="muted">
                {device.platform} · {t(locale, 'lastSync')}: {formatDate(device.lastSyncAt, locale)}
              </p>
            </div>
            <button
              type="button"
              className="button primary"
              disabled={demoRunning}
              onClick={() => void handleDemo()}
            >
              {t(locale, 'runDemo')}
            </button>
          </section>

          <section className="summary-grid compact">
            <div className="summary-card safe">
              <strong>{device.riskCounts.safe}</strong>
              <span>{t(locale, 'safe')}</span>
            </div>
            <div className="summary-card unusual">
              <strong>{device.riskCounts.unusual}</strong>
              <span>{t(locale, 'unusual')}</span>
            </div>
            <div className="summary-card suspicious">
              <strong>{device.riskCounts.suspicious}</strong>
              <span>{t(locale, 'suspicious')}</span>
            </div>
          </section>

          <section className="panel">
            <h2>{t(locale, 'recentAlerts')}</h2>
            {alerts.length === 0 ? (
              <p className="muted">{t(locale, 'noAlerts')}</p>
            ) : (
              <ul className="alert-list detailed">
                {alerts.map((alert) => (
                  <li key={alert.id}>
                    <div>
                      <strong>{alert.title}</strong>
                      <p>{alert.message}</p>
                      {alert.domain && <code>{alert.domain}</code>}
                    </div>
                    <div className="alert-actions">
                      <RiskBadge level={alert.level} locale={locale} />
                      <button
                        type="button"
                        className="button danger"
                        onClick={() => void handleAlertAction(alert.id, 'block')}
                      >
                        {t(locale, 'block')}
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => void handleAlertAction(alert.id, 'allow')}
                      >
                        {t(locale, 'allow')}
                      </button>
                      <button
                        type="button"
                        className="button ghost"
                        onClick={() => void handleAlertAction(alert.id, 'ignore')}
                      >
                        {t(locale, 'ignore')}
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel">
            <h2>{t(locale, 'appsOnDevice')} ({apps.length})</h2>
            <div className="apps-table-wrap">
              <table className="apps-table">
                <thead>
                  <tr>
                    <th>{t(locale, 'totalApps')}</th>
                    <th>{t(locale, 'suspicious')}</th>
                    <th>{t(locale, 'explanation')}</th>
                  </tr>
                </thead>
                <tbody>
                  {apps.map((app) => (
                    <tr key={app.id}>
                      <td>
                        <strong>{app.displayName}</strong>
                        <div className="muted">{app.packageName}</div>
                      </td>
                      <td>
                        <RiskBadge level={app.riskLevel} locale={locale} />
                      </td>
                      <td>{app.riskScore > 0 ? `${app.riskScore}` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}
    </Layout>
  );
}
