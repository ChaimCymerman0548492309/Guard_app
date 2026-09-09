import { AppCategory } from './enums.js';

const PHOTO_KEYWORDS = ['photo', 'camera', 'gallery', 'image', 'pics', 'snap', 'selfie'];
const MESSAGING_KEYWORDS = [
  'whatsapp',
  'telegram',
  'signal',
  'messenger',
  'sms',
  'messaging',
  'chat',
  'viber',
  'wechat',
  'line',
  'discord',
];
const SOCIAL_KEYWORDS = [
  'social',
  'facebook',
  'instagram',
  'twitter',
  'tiktok',
  'snapchat',
  'linkedin',
  'reddit',
  'pinterest',
];
const BROWSER_KEYWORDS = ['browser', 'chrome', 'firefox', 'opera', 'safari', 'webview'];
const FINANCE_KEYWORDS = [
  'bank',
  'finance',
  'wallet',
  'pay',
  'payment',
  'paypal',
  'venmo',
  'crypto',
];

/** Infer app category from package name and display name heuristics. */
export function inferAppCategory(packageName: string, displayName: string): AppCategory {
  const haystack = `${packageName} ${displayName}`.toLowerCase();

  if (PHOTO_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.PHOTO;
  }
  if (MESSAGING_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.MESSAGING;
  }
  if (SOCIAL_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.SOCIAL;
  }
  if (BROWSER_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.BROWSER;
  }
  if (FINANCE_KEYWORDS.some((keyword) => haystack.includes(keyword))) {
    return AppCategory.FINANCE;
  }

  return AppCategory.UTILITY;
}
