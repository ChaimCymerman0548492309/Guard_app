import { LARGE_UPLOAD_BYTES, RULE_WEIGHTS, RuleId } from '@guardian/shared';
import type { RiskRule } from '../types.js';

export const largeUploadRule: RiskRule = {
  id: RuleId.LARGE_UPLOAD,
  name: 'Large Upload',
  description: 'App uploaded an unusually large amount of data',
  weight: RULE_WEIGHTS.LARGE_UPLOAD,
  evaluate(context) {
    const totalSent = context.networkEvents.reduce((sum, e) => sum + e.bytesSent, 0);

    if (totalSent >= LARGE_UPLOAD_BYTES) {
      const mb = Math.round(totalSent / (1024 * 1024));
      return {
        ruleId: RuleId.LARGE_UPLOAD,
        triggered: true,
        weight: this.weight,
        reason: `Uploaded ${mb} MB of data`,
      };
    }

    return {
      ruleId: RuleId.LARGE_UPLOAD,
      triggered: false,
      weight: 0,
      reason: 'Upload size within normal range',
    };
  },
};
