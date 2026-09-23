import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { Alert, DeviceSummary, NetworkEvent } from '@guardian/shared';
import {
  alertAction,
  formatDate,
  getDeviceSummary,
  listDeviceAlerts,
  listDeviceApps,
  listDeviceEvents,
  type AppWithRisk,
} from '../api';
import { Layout } from '../components/Layout';
import { RiskBadge } from '../components/RiskBadge';
import type { Locale } from '../i18n';
import { t } from '../i18n';

interface DevicePageProps {
  locale: Locale;
  onToggleLocale: () => void;
}

export function DevicePage({ locale, onToggleLocale }: DevicePageProps) {
  const { deviceId = '' } = useParams();
  const [device, setDevice] = useState<DeviceSummary | null>(null);
  const [apps, setApps] = useState<AppWithRisk[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [events, setEvents] = useState<NetworkEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(
    async (mode: 'initial' | 'silent' = 'initial') => {
      if (!deviceId) return;
      if (mode === 'initial') {
        setLoading(true);
        setError(null);
        setNotFound(false);
      }
      try {
        const [summary, appList, alertList, eventList] = await Promise.all([
          getDeviceSummary(deviceId),
          listDeviceApps(deviceId),
          listDeviceAlerts(deviceId, false),
          listDeviceEvents(deviceId),
        ]);
        setDevice(summary);
        setApps(appList);
        setAlerts(alertList);
        setEvents(eventList);
        setError(null);
        setNotFound(false);
      } catch (err) {
        if (mode === 'silent') return;
        const message = err instanceof Error ? err.message : t(locale, 'error');
        if (message.toLowerCase().includes('not found') || message.includes('404')) {
          setNotFound(true);
        } else {
          setError(message);
        }
      } finally {
        if (mode === 'initial') setLoading(false);
      }
    },
    [deviceId, locale],
  );

  useEffect(() => {
    void load('initial');
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') {
        void load('silent');
      }
    }, 10_000);
    return () => clearInterval(timer);
  }, [load]);

  async function handleAlertAction(alertId: string, action: 'block' | 'allow' | 'ignore') {
    await alertAction(alertId, action);
    await load('silent');
  }

  function appLabel(appId: string): string {
    return apps.find((app) => app.id === appId)?.displayName ?? appId;
  }

  return (
    <Layout locale={locale} onToggleLocale={onToggleLocale} onRefresh={() => void load()}>
      <Link className="back-link" to="/">
        ← {t(locale, 'back')}
      </Link>

      {loading && <p>{t(locale, 'loading')}</p>}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notFound && !loading && (
        <section className="panel empty-state" role="alert">
          <p className="error">{t(locale, 'deviceNotFound')}</p>
        </section>
      )}

      {device && (
        <>
          <section className="panel device-header">
            <div>
              <h1>{device.name}</h1>
              <p className="muted">
                {device.platform} · {t(locale, 'lastSync')}: {formatDate(device.lastSyncAt, locale)}
              </p>
            </div>
            <span className="live-pill">{t(locale, 'live')}</span>
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

          <p className="banner scenario-banner">{t(locale, 'alertScenario')}</p>

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
            <h2>{t(locale, 'timeline')}</h2>
            {events.length === 0 ? (
              <p className="muted">{t(locale, 'noTimeline')}</p>
            ) : (
              <ol className="timeline">
                {events.map((event) => (
                  <li key={event.id}>
                    <time dateTime={new Date(event.timestamp).toISOString()}>
                      {formatDate(event.timestamp, locale)}
                    </time>
                    <div className="timeline-body">
                      <strong>{appLabel(event.appId)}</strong>
                      <code>{event.domain}</code>
                      {event.isNewDomain && (
                        <span className="domain-pill">{t(locale, 'newDomain')}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section className="panel">
            <h2>
              {t(locale, 'appsOnDevice')} ({apps.length})
            </h2>
            {apps.length === 0 ? (
              <p className="muted">{t(locale, 'noAppsOnDevice')}</p>
            ) : (
              <div className="apps-table-wrap">
                <table className="apps-table">
                  <thead>
                    <tr>
                      <th>{t(locale, 'totalApps')}</th>
                      <th>{t(locale, 'level')}</th>
                      <th>{t(locale, 'score')}</th>
                      <th>{t(locale, 'explanation')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...apps]
                      .sort((a, b) => {
                        const aTime = a.assessedAt ? new Date(a.assessedAt).getTime() : 0;
                        const bTime = b.assessedAt ? new Date(b.assessedAt).getTime() : 0;
                        return bTime - aTime;
                      })
                      .map((app) => (
                        <tr key={app.id}>
                          <td>
                            <strong>{app.displayName}</strong>
                            <div className="muted">{app.packageName}</div>
                          </td>
                          <td>
                            <RiskBadge level={app.riskLevel} locale={locale} />
                          </td>
                          <td>{app.riskScore > 0 ? `${app.riskScore}` : '—'}</td>
                          <td className="explanation-cell">
                            {app.explanation?.trim() ? (
                              app.explanation
                            ) : (
                              <span className="muted">{t(locale, 'noExplanation')}</span>
                            )}
                            {app.assessedAt && (
                              <div className="muted">{formatDate(app.assessedAt, locale)}</div>
                            )}
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}
    </Layout>
  );
}
