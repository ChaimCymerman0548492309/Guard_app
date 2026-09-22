import type { RiskAssessment } from '@guardian/shared';
import type { AssessmentInput, RiskRule } from '../types.js';
import { defaultRules } from '../rules/index.js';
import { calculateScore, scoreToLevel } from '../scoring/score.js';
import { buildExplanation } from '../explanations/build-explanation.js';
import { KNOWN_TRACKER_DOMAINS } from '@guardian/shared';

function randomUUID(): string {
  if (typeof globalThis.crypto?.randomUUID === 'function') {
    return globalThis.crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export class RiskDetector {
  private rules: RiskRule[];

  constructor(rules: RiskRule[] = defaultRules) {
    this.rules = rules;
  }

  assess(input: AssessmentInput): RiskAssessment {
    const context = {
      appId: input.appId,
      appCategory: input.appCategory,
      networkEvents: input.networkEvents,
      securityEvents: input.securityEvents,
      baseline: input.baseline,
      knownTrackerDomains: input.knownTrackerDomains ?? KNOWN_TRACKER_DOMAINS,
    };

    const results = this.rules.map((rule) => rule.evaluate(context));
    const score = calculateScore(results, input.trustLevel);
    const level = scoreToLevel(score);
    const triggeredRules = results.filter((r) => r.triggered).map((r) => r.ruleId);

    return {
      id: randomUUID(),
      appId: input.appId,
      score,
      level,
      triggeredRules,
      explanation: buildExplanation(level, results),
      assessedAt: new Date(),
    };
  }
}
