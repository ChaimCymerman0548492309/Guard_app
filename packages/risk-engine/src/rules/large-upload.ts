import { RuleId } from '@guardian/shared';
import type { RiskRule } from '../types.js';

const LARGE_UPLOAD_BYTES = 100 * 1024 * 1024; // 100 MB

export const largeUploadRule: RiskRule = {
  id: RuleId.LARGE_UPLOAD,
  name: 'Large Upload',
  description: 'App uploaded an unusually large amount of data',
  weight: 25,
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
