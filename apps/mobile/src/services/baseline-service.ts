import type { AppBehaviorBaseline, NetworkEvent } from '@guardian/shared';

export function isNewDomainForApp(
  baselines: AppBehaviorBaseline[],
  appId: string,
  domain: string,
): boolean {
  const baseline = baselines.find((b) => b.appId === appId);
  if (!baseline) return true;
  return !baseline.knownDomains.includes(domain);
}

export function updateBaseline(
  baselines: AppBehaviorBaseline[],
  event: NetworkEvent,
): AppBehaviorBaseline {
  const existing = baselines.find((b) => b.appId === event.appId);
  const hour = event.timestamp.getHours();

  if (!existing) {
    const created: AppBehaviorBaseline = {
      appId: event.appId,
      avgDailyConnections: 1,
      knownDomains: [event.domain],
      avgUploadBytes: event.bytesSent,
      activeHours: [hour],
      lastUpdated: event.timestamp,
    };
    baselines.push(created);
    return created;
  }

  if (!existing.knownDomains.includes(event.domain)) {
    existing.knownDomains = [...existing.knownDomains, event.domain].slice(-100);
  }

  existing.avgDailyConnections = Math.round(existing.avgDailyConnections * 0.9 + 1);
  existing.avgUploadBytes = Math.round(existing.avgUploadBytes * 0.9 + event.bytesSent);
  if (!existing.activeHours.includes(hour)) {
    existing.activeHours = [...existing.activeHours, hour].sort((a, b) => a - b);
  }
  existing.lastUpdated = event.timestamp;
  return existing;
}

export function buildBaselineFromEvents(
  appId: string,
  events: NetworkEvent[],
): AppBehaviorBaseline {
  const domains = [...new Set(events.map((e) => e.domain))];
  const totalUpload = events.reduce((sum, e) => sum + e.bytesSent, 0);
  const hours = [...new Set(events.map((e) => e.timestamp.getHours()))].sort((a, b) => a - b);

  return {
    appId,
    avgDailyConnections: events.length,
    knownDomains: domains,
    avgUploadBytes: events.length > 0 ? Math.round(totalUpload / events.length) : 0,
    activeHours: hours,
    lastUpdated: new Date(),
  };
}
