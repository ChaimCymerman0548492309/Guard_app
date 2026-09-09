import { RuleId } from '@guardian/shared';
import type { RiskRule } from '../types.js';

const UNUSUAL_CONNECTION_COUNT = 50;

export const unusualNetworkActivityRule: RiskRule = {
  id: RuleId.UNUSUAL_NETWORK_ACTIVITY,
  name: 'Unusual Network Activity',
  description: 'App made significantly more network connections than usual',
  weight: 20,
  evaluate(context) {
    const connectionCount = context.networkEvents.length;
    const baseline = context.baseline?.avgDailyConnections ?? 10;
    const threshold = Math.max(UNUSUAL_CONNECTION_COUNT, baseline * 3);

    if (connectionCount >= threshold) {
      return {
        ruleId: RuleId.UNUSUAL_NETWORK_ACTIVITY,
        triggered: true,
        weight: this.weight,
        reason: `${connectionCount} connections (usual: ~${baseline})`,
      };
    }

    return {
      ruleId: RuleId.UNUSUAL_NETWORK_ACTIVITY,
      triggered: false,
      weight: 0,
      reason: 'Network activity within normal range',
    };
  },
};
