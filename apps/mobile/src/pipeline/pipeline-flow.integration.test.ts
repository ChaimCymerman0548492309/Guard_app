import { describe, it, expect } from 'vitest';
import { RiskDetector } from '@guardian/risk-engine';
import { generateEvents } from '@guardian/simulator';
import { PHOTO_CLEANER_APP_ID } from '@guardian/simulator';
import {
  AppCategory,
  RiskLevel,
  SimulatorScenario,
  TrustLevel,
  AlertAction,
} from '@guardian/shared';
import { applyAlertAction, generateAlertsFromAssessments } from '../services/alert-service';

/**
 * Integration-level E2E for the critical monitoring flow (no device/SQLite required):
 * simulator events → risk assessment → alert generation → user action.
 */
describe('Pipeline flow integration', () => {
  const photoCleanerApp = {
    id: PHOTO_CLEANER_APP_ID,
    packageName: 'com.photo.editor.cleaner',
    displayName: 'Photo Editor',
    category: AppCategory.PHOTO,
    isSystem: false,
    trustLevel: TrustLevel.NEUTRAL,
  };

  it('Photo Cleaner scenario: events → SUSPICIOUS assessment → blockable alert', () => {
    const { networkEvents, securityEvents } = generateEvents(
      PHOTO_CLEANER_APP_ID,
      SimulatorScenario.HIGH_RISK,
    );

    const detector = new RiskDetector();
    const assessment = detector.assess({
      appId: photoCleanerApp.id,
      appCategory: photoCleanerApp.category,
      networkEvents,
      securityEvents,
      trustLevel: photoCleanerApp.trustLevel,
    });

    expect(assessment.level).toBe(RiskLevel.SUSPICIOUS);
    expect(assessment.triggeredRules.length).toBeGreaterThan(0);
    expect(assessment.triggeredRules).toContain('LARGE_UPLOAD');
    expect(assessment.triggeredRules).toContain('SENSITIVE_APP_BEHAVIOR');

    const alerts = generateAlertsFromAssessments([photoCleanerApp], [assessment]);
    expect(alerts).toHaveLength(1);
    expect(alerts[0].notifyImmediately).toBe(true);

    const blocked = applyAlertAction(alerts[0], AlertAction.BLOCK);
    expect(blocked.userAction).toBe(AlertAction.BLOCK);
    expect(blocked.acknowledged).toBe(true);

    const ignored = applyAlertAction(alerts[0], AlertAction.IGNORE);
    expect(ignored.userAction).toBe(AlertAction.IGNORE);
    expect(ignored.acknowledged).toBe(true);
  });

  it('normal app scenario stays SAFE with no alerts', () => {
    const normalApp = {
      id: 'app-whatsapp',
      packageName: 'com.whatsapp',
      displayName: 'WhatsApp',
      category: AppCategory.MESSAGING,
      isSystem: false,
      trustLevel: TrustLevel.NEUTRAL,
    };
    const { networkEvents, securityEvents } = generateEvents(
      normalApp.id,
      SimulatorScenario.NORMAL,
    );
    const assessment = new RiskDetector().assess({
      appId: normalApp.id,
      appCategory: normalApp.category,
      networkEvents,
      securityEvents,
      trustLevel: normalApp.trustLevel,
    });
    expect(assessment.level).toBe(RiskLevel.SAFE);
    expect(generateAlertsFromAssessments([normalApp], [assessment])).toHaveLength(0);
  });
});
