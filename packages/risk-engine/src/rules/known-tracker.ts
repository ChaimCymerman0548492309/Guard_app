import { RULE_WEIGHTS, RuleId } from '@guardian/shared';
import type { RiskRule } from '../types.js';

export const knownTrackerRule: RiskRule = {
  id: RuleId.KNOWN_TRACKER,
  name: 'Known Tracker',
  description: 'App connected to a known advertising or tracking domain',
  weight: RULE_WEIGHTS.KNOWN_TRACKER,
  evaluate(context) {
    const trackerDomains = context.knownTrackerDomains;
    const matched = context.networkEvents.filter((e) =>
      trackerDomains.some((t) => e.domain.includes(t)),
    );

    if (matched.length > 0) {
      const domains = [...new Set(matched.map((e) => e.domain))].join(', ');
      return {
        ruleId: RuleId.KNOWN_TRACKER,
        triggered: true,
        weight: this.weight,
        reason: `Connected to known tracker domains: ${domains}`,
      };
    }

    return {
      ruleId: RuleId.KNOWN_TRACKER,
      triggered: false,
      weight: 0,
      reason: 'No known tracker domains detected',
    };
  },
};
