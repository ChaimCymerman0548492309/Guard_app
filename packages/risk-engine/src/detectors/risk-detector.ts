import { randomUUID } from 'node:crypto';
import type { RiskAssessment } from '@guardian/shared';
import type { AssessmentInput, RiskRule } from '../types.js';
import { defaultRules } from '../rules/index.js';
import { calculateScore, scoreToLevel } from '../scoring/score.js';
import { buildExplanation } from '../explanations/build-explanation.js';
import { KNOWN_TRACKER_DOMAINS } from '@guardian/shared';

export class RiskDetector {
  private rules: RiskRule[];

  constructor(rules: RiskRule[] = defaultRules) {
    this.rules = rules;
  }

  assess(input: AssessmentInput): RiskAssessment {
    const context = {
      appId: input.appId,
      networkEvents: input.networkEvents,
      securityEvents: input.securityEvents,
      baseline: input.baseline,
      knownTrackerDomains: input.knownTrackerDomains ?? KNOWN_TRACKER_DOMAINS,
    };

    const results = this.rules.map((rule) => rule.evaluate(context));
    const score = calculateScore(results);
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
