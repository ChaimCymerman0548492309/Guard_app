export interface NativeInstalledApp {
  packageName: string;
  displayName: string;
  isSystem: boolean;
}

export interface InstalledAppsProvider {
  getLauncherApps(): Promise<NativeInstalledApp[]>;
  isSupported(): boolean;
}
