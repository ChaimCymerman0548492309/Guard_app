export type RootStackParamList = {
  Home: undefined;
  Apps: undefined;
  AppDetails: { appId: string };
  Alert: { alertId: string };
  Timeline: undefined;
  Permissions: undefined;
  Settings: undefined;
  LegalDocument: { type: 'privacy' | 'terms' };
  About: undefined;
};
