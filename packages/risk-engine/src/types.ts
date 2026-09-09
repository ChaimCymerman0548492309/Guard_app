import type { NetworkEvent, SecurityEvent, AppBehaviorBaseline, TrustLevel } from '@guardian/shared';
import type { RuleId } from '@guardian/shared';

export interface RiskContext {
  appId: string;
  networkEvents: NetworkEvent[];
  securityEvents: SecurityEvent[];
  baseline?: AppBehaviorBaseline;
  knownTrackerDomains: readonly string[];
}

export interface RuleResult {
  ruleId: RuleId;
  triggered: boolean;
  weight: number;
  reason: string;
}

export interface RiskRule {
  id: RuleId;
  name: string;
  description: string;
  weight: number;
  evaluate(context: RiskContext): RuleResult;
}

export interface AssessmentInput {
  appId: string;
  networkEvents: NetworkEvent[];
  securityEvents: SecurityEvent[];
  baseline?: AppBehaviorBaseline;
  knownTrackerDomains?: readonly string[];
  trustLevel?: TrustLevel;
}
