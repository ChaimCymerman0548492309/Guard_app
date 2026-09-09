import type { DomainReputation, DomainReputationProvider } from '@guardian/shared';
import { KNOWN_TRACKER_DOMAINS } from '@guardian/shared';

/** Stub provider — interface only; replace with remote/local feed in production. */
export class StubDomainReputationProvider implements DomainReputationProvider {
  async lookup(domain: string): Promise<DomainReputation | null> {
    const normalized = domain.toLowerCase();
    const isTracker = KNOWN_TRACKER_DOMAINS.some(
      (tracker) => normalized === tracker || normalized.endsWith(`.${tracker}`),
    );

    if (!isTracker) return null;

    return {
      domain,
      isTracker: true,
      category: 'advertising',
      reputationScore: 20,
    };
  }
}
