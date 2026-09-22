export const APP_NAME = 'Guardian';

/** Fallback when app display name is unavailable (API/sync paths only) */
export const FALLBACK_APP_NAME = 'Unknown App';

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

/** Demo / lab app id (Photo Cleaner scenario). */
export const PHOTO_CLEANER_APP_ID = 'app-photo-editor';

import { TRACKER_REPUTATION_DB } from './domain-reputation.js';

export const KNOWN_TRACKER_DOMAINS = TRACKER_REPUTATION_DB.map(
  (entry) => entry.domain,
) as readonly string[];
