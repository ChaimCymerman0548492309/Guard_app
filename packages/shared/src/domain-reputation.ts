import type { DomainReputation, DomainReputationProvider } from './types.js';

export interface TrackerEntry {
  domain: string;
  category: string;
  reputationScore: number;
}

/** Local reputation database for known trackers and ad networks. */
export const TRACKER_REPUTATION_DB: readonly TrackerEntry[] = [
  { domain: 'doubleclick.net', category: 'advertising', reputationScore: 15 },
  { domain: 'google-analytics.com', category: 'analytics', reputationScore: 25 },
  { domain: 'googletagmanager.com', category: 'analytics', reputationScore: 25 },
  { domain: 'facebook.com', category: 'social-tracking', reputationScore: 20 },
  { domain: 'connect.facebook.net', category: 'social-tracking', reputationScore: 20 },
  { domain: 'adservice.google.com', category: 'advertising', reputationScore: 15 },
  { domain: 'scorecardresearch.com', category: 'analytics', reputationScore: 18 },
  { domain: 'moatads.com', category: 'advertising', reputationScore: 12 },
  { domain: 'ads.twitter.com', category: 'advertising', reputationScore: 15 },
  { domain: 'analytics.twitter.com', category: 'analytics', reputationScore: 22 },
  { domain: 'adsrvr.org', category: 'advertising', reputationScore: 14 },
  { domain: 'adnxs.com', category: 'advertising', reputationScore: 12 },
  { domain: 'taboola.com', category: 'advertising', reputationScore: 16 },
  { domain: 'outbrain.com', category: 'advertising', reputationScore: 16 },
  { domain: 'hotjar.com', category: 'analytics', reputationScore: 28 },
  { domain: 'mixpanel.com', category: 'analytics', reputationScore: 30 },
  { domain: 'segment.io', category: 'analytics', reputationScore: 28 },
  { domain: 'appsflyer.com', category: 'attribution', reputationScore: 22 },
  { domain: 'adjust.com', category: 'attribution', reputationScore: 22 },
  { domain: 'crashlytics.com', category: 'crash-reporting', reputationScore: 35 },
];

function normalizeDomain(domain: string): string {
  return domain.toLowerCase().replace(/^\*\./, '').replace(/\.$/, '');
}

function domainMatches(normalized: string, trackerDomain: string): boolean {
  return normalized === trackerDomain || normalized.endsWith(`.${trackerDomain}`);
}

function findTrackerEntry(domain: string): TrackerEntry | undefined {
  const normalized = normalizeDomain(domain);
  return TRACKER_REPUTATION_DB.find((entry) => domainMatches(normalized, entry.domain));
}

/** Local-first domain reputation lookup backed by a static tracker list. */
export class LocalDomainReputationProvider implements DomainReputationProvider {
  async lookup(domain: string): Promise<DomainReputation | null> {
    const entry = findTrackerEntry(domain);
    if (!entry) return null;

    return {
      domain,
      isTracker: true,
      category: entry.category,
      reputationScore: entry.reputationScore,
    };
  }
}

export function lookupDomainReputation(domain: string): DomainReputation | null {
  const entry = findTrackerEntry(domain);
  if (!entry) return null;

  return {
    domain,
    isTracker: true,
    category: entry.category,
    reputationScore: entry.reputationScore,
  };
}
