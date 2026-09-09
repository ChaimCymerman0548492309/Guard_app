import { RuleId } from '@guardian/shared';
import type { RiskRule } from '../types.js';

export const newDomainRule: RiskRule = {
  id: RuleId.NEW_DOMAIN,
  name: 'New Domain',
  description: 'App contacted a domain not seen before for this app',
  weight: 20,
  evaluate(context) {
    const newDomains = context.networkEvents.filter((e) => e.isNewDomain);

    if (newDomains.length > 0) {
      const domains = [...new Set(newDomains.map((e) => e.domain))].join(', ');
      return {
        ruleId: RuleId.NEW_DOMAIN,
        triggered: true,
        weight: this.weight,
        reason: `Contacted new domains: ${domains}`,
      };
    }

    return {
      ruleId: RuleId.NEW_DOMAIN,
      triggered: false,
      weight: 0,
      reason: 'No new domains detected',
    };
  },
};
