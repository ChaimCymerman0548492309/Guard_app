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

export const KNOWN_TRACKER_DOMAINS = [
  'doubleclick.net',
  'google-analytics.com',
  'facebook.com',
  'adservice.google.com',
  'scorecardresearch.com',
  'moatads.com',
  'ads.twitter.com',
] as const;
