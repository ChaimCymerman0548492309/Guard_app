export const APP_NAME = 'Guardian';

export const RISK_LEVEL_LABELS = {
  SAFE: 'Safe',
  UNUSUAL: 'Unusual',
  SUSPICIOUS: 'Suspicious',
} as const;

export const RISK_LEVEL_COLORS = {
  SAFE: '#22c55e',
  UNUSUAL: '#f59e0b',
  SUSPICIOUS: '#ef4444',
} as const;

export const API_VERSION = 'v1';

import { TRACKER_REPUTATION_DB } from './domain-reputation.js';

export const KNOWN_TRACKER_DOMAINS = TRACKER_REPUTATION_DB.map(
  (entry) => entry.domain,
) as readonly string[];
