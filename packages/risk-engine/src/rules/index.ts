import { knownTrackerRule } from './known-tracker.js';
import { newDomainRule } from './new-domain.js';
import { largeUploadRule } from './large-upload.js';
import { unusualNetworkActivityRule } from './unusual-network-activity.js';
import { sensitiveAppBehaviorRule } from './sensitive-app-behavior.js';
import type { RiskRule } from '../types.js';

export const defaultRules: RiskRule[] = [
  knownTrackerRule,
  newDomainRule,
  largeUploadRule,
  unusualNetworkActivityRule,
  sensitiveAppBehaviorRule,
];

export {
  knownTrackerRule,
  newDomainRule,
  largeUploadRule,
  unusualNetworkActivityRule,
  sensitiveAppBehaviorRule,
};
