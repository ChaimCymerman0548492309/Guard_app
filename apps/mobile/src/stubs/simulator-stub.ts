/** Stubbed in production APK builds (EXPO_PUBLIC_DEV_SIMULATOR=false). */

export const PHOTO_CLEANER_APP_ID = 'app-photo-editor';

export function createSimulator(): never {
  throw new Error('Simulator is disabled in this build');
}

export function generateEvents(): { networkEvents: never[]; securityEvents: never[] } {
  return { networkEvents: [], securityEvents: [] };
}
