import type { Alert, App, RiskAssessment } from '@guardian/shared';
import { AlertAction, FALLBACK_APP_NAME, RiskLevel, TrustLevel } from '@guardian/shared';

export interface NotificationPolicy {
  silent: boolean;
  immediate: boolean;
  offerBlock: boolean;
}

export function getNotificationPolicy(level: RiskLevel): NotificationPolicy {
  switch (level) {
    case RiskLevel.SAFE:
      return { silent: true, immediate: false, offerBlock: false };
    case RiskLevel.UNUSUAL:
      return { silent: false, immediate: false, offerBlock: false };
    case RiskLevel.SUSPICIOUS:
      return { silent: false, immediate: true, offerBlock: true };
    default:
      return { silent: true, immediate: false, offerBlock: false };
  }
}

export function generateAlertsFromAssessments(apps: App[], assessments: RiskAssessment[]): Alert[] {
  return assessments
    .filter((a) => a.level !== RiskLevel.SAFE)
    .filter((assessment) => {
      const app = apps.find((ap) => ap.id === assessment.appId);
      return !(app?.trustLevel === TrustLevel.TRUSTED && assessment.level === RiskLevel.UNUSUAL);
    })
    .map((assessment) => {
      const app = apps.find((ap) => ap.id === assessment.appId);
      const policy = getNotificationPolicy(assessment.level);
      return {
        id: `alert-${assessment.id}`,
        appId: assessment.appId,
        riskAssessmentId: assessment.id,
        title: app?.displayName ?? FALLBACK_APP_NAME,
        message: assessment.explanation,
        level: assessment.level,
        acknowledged: false,
        createdAt: assessment.assessedAt,
        userAction: AlertAction.NONE,
        notifyImmediately: app?.trustLevel === TrustLevel.TRUSTED ? false : policy.immediate,
      };
    });
}

export function applyAlertAction(alert: Alert, action: AlertAction): Alert {
  return { ...alert, userAction: action, acknowledged: action !== AlertAction.NONE };
}
