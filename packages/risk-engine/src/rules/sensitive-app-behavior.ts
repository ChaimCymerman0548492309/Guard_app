import { AppCategory, RuleId, SecurityEventType } from '@guardian/shared';
import type { RiskRule } from '../types.js';

const SENSITIVE_PHOTO_THRESHOLD = 500;
const PHOTO_APP_THRESHOLD = 200;

export const sensitiveAppBehaviorRule: RiskRule = {
  id: RuleId.SENSITIVE_APP_BEHAVIOR,
  name: 'Sensitive App Behavior',
  description: 'App accessed sensitive data in an unusual way',
  weight: 35,
  evaluate(context) {
    const photoEvents = context.securityEvents.filter(
      (e) => e.type === SecurityEventType.PHOTO_ACCESS,
    );

    const totalPhotos =
      photoEvents.reduce((sum, e) => {
        const count = typeof e.metadata.photoCount === 'number' ? e.metadata.photoCount : 0;
        return sum + count;
      }, 0) || photoEvents.length;

    const contactEvents = context.securityEvents.filter(
      (e) => e.type === SecurityEventType.CONTACT_ACCESS,
    );

    const photoThreshold =
      context.appCategory === AppCategory.PHOTO ? PHOTO_APP_THRESHOLD : SENSITIVE_PHOTO_THRESHOLD;

    if (totalPhotos >= photoThreshold) {
      return {
        ruleId: RuleId.SENSITIVE_APP_BEHAVIOR,
        triggered: true,
        weight: this.weight,
        reason: `Accessed ${totalPhotos} photos`,
      };
    }

    if (contactEvents.length > 0) {
      return {
        ruleId: RuleId.SENSITIVE_APP_BEHAVIOR,
        triggered: true,
        weight: this.weight,
        reason: 'Accessed contacts without clear purpose',
      };
    }

    return {
      ruleId: RuleId.SENSITIVE_APP_BEHAVIOR,
      triggered: false,
      weight: 0,
      reason: 'No sensitive data access detected',
    };
  },
};
