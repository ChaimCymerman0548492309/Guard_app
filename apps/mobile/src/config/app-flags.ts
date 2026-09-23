/** Product mode: real devices only (no simulated app data). */
export function isDevSimulatorEnabled(): boolean {
  return false;
}

/** Demo UI is disabled — use a physical device with VPN + cloud sync. */
export function showDevUi(): boolean {
  return false;
}
