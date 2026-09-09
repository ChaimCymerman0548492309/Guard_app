declare const __DEV__: boolean | undefined;

/** True when EXPO_PUBLIC_DEV_SIMULATOR is explicitly enabled (opt-in). */
export function isDevSimulatorEnabled(): boolean {
  return process.env.EXPO_PUBLIC_DEV_SIMULATOR === 'true';
}

function isDevBuild(): boolean {
  return typeof __DEV__ !== 'undefined' && __DEV__;
}

/** Dev-only UI: demo button and simulator banner (hidden in production builds). */
export function showDevUi(): boolean {
  return isDevBuild() && isDevSimulatorEnabled();
}
