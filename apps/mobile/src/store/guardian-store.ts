import { create } from 'zustand';
import type {
  Alert,
  App,
  RiskAssessment,
  RiskCounts,
  TimelineEvent,
  VpnServiceStatus,
} from '@guardian/shared';
import { AlertAction, TrustLevel, VpnStatus, SimulatorScenario } from '@guardian/shared';
import { createSimulator, generateEvents } from '@guardian/simulator';
import { getDatabase, clearDatabase } from '../db/database';
import { computeRiskCounts, loadAlerts, upsertAlert, upsertApp } from '../db/repositories';
import { EventPipeline, seedSimulatorData } from '../pipeline/event-pipeline';
import { getGuardianVpnService } from '../native/guardian-vpn';
import { applyAlertAction } from '../services/alert-service';
import { initNotifications, notifyForAlert } from '../services/notification-service';
import { syncInstalledAppsFromDevice } from '../services/installed-apps-service';
import {
  countUnsyncedNetworkEvents,
  deriveSyncStatus,
  getApiBaseUrl,
  syncPendingEvents,
  type SyncStatus,
} from '../services/sync-service';
import { PHOTO_CLEANER_APP_ID } from '@guardian/simulator';
import {
  getLanguage,
  isOnboardingComplete,
  setOnboardingComplete,
} from '../services/settings-service';
import i18n from '../i18n';

interface GuardianState {
  apps: App[];
  assessments: RiskAssessment[];
  counts: RiskCounts;
  alerts: Alert[];
  timeline: TimelineEvent[];
  isLoading: boolean;
  isSimulator: boolean;
  vpnStatus: VpnServiceStatus;
  syncStatus: SyncStatus;
  syncPendingCount: number;
  syncError?: string;
  showTechnicalDetails: boolean;
  onboardingComplete: boolean;
  lastScanAt: Date | null;
  loadData: () => Promise<void>;
  completeOnboarding: () => Promise<void>;
  startMonitoring: () => Promise<void>;
  stopMonitoring: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => Promise<void>;
  handleAlertAction: (alertId: string, action: AlertAction) => Promise<void>;
  toggleTechnicalDetails: () => void;
  trustApp: (appId: string) => Promise<void>;
  refreshFromDb: () => Promise<void>;
  runDemoScenario: () => Promise<void>;
}

const SCENARIO_MAP: Record<string, SimulatorScenario> = {
  'app-whatsapp': SimulatorScenario.NORMAL,
  'app-google-photos': SimulatorScenario.NORMAL,
  'app-photo-editor': SimulatorScenario.HIGH_RISK,
  'app-calculator': SimulatorScenario.NORMAL,
  'app-unknown': SimulatorScenario.UNUSUAL,
};

let pipeline: EventPipeline | null = null;
let vpnSubscription: { remove: () => void } | null = null;
let vpnStatsTimer: ReturnType<typeof setInterval> | null = null;

async function refreshSyncState(
  set: (partial: Partial<GuardianState>) => void,
  isSyncing = false,
): Promise<void> {
  const db = await getDatabase();
  const pending = await countUnsyncedNetworkEvents(db);
  const apiConfigured = getApiBaseUrl() !== null;
  set({
    syncPendingCount: pending,
    syncStatus: deriveSyncStatus(apiConfigured, pending, isSyncing),
  });
}

async function runCloudSync(set: (partial: Partial<GuardianState>) => void): Promise<void> {
  if (!getApiBaseUrl()) {
    await refreshSyncState(set);
    return;
  }

  set({ syncStatus: 'syncing' });
  const result = await syncPendingEvents();
  set({
    syncPendingCount: result.pending ?? 0,
    syncError: result.error,
    syncStatus: deriveSyncStatus(true, result.pending ?? 0, false, result.error),
  });
}

async function getPipeline(): Promise<EventPipeline> {
  if (!pipeline) {
    pipeline = new EventPipeline();
    await pipeline.initialize();
  }
  return pipeline;
}

export const useGuardianStore = create<GuardianState>((set, get) => ({
  apps: [],
  assessments: [],
  counts: { safe: 0, unusual: 0, suspicious: 0 },
  alerts: [],
  timeline: [],
  isLoading: true,
  isSimulator: process.env.EXPO_PUBLIC_DEV_SIMULATOR !== 'false',
  vpnStatus: { status: VpnStatus.STOPPED, isSupported: false },
  syncStatus: 'disabled',
  syncPendingCount: 0,
  showTechnicalDetails: false,
  onboardingComplete: false,
  lastScanAt: null,

  refreshFromDb: async () => {
    const db = await getDatabase();
    const pipe = await getPipeline();
    const state = await pipe.refreshState();
    const alerts = await loadAlerts(db);
    set({
      apps: state.apps,
      assessments: state.assessments,
      timeline: state.timeline,
      alerts,
      counts: computeRiskCounts(state.assessments),
      lastScanAt: new Date(),
    });
  },

  completeOnboarding: async () => {
    const db = await getDatabase();
    await setOnboardingComplete(db, true);
    set({ onboardingComplete: true });
  },

  loadData: async () => {
    set({ isLoading: true });
    const db = await getDatabase();
    const onboarded = await isOnboardingComplete(db);
    await i18n.changeLanguage(await getLanguage(db));
    await initNotifications();
    const isSimulator = process.env.EXPO_PUBLIC_DEV_SIMULATOR !== 'false';
    const vpn = getGuardianVpnService();
    const isSupported = await vpn.isSupported();
    const vpnStatus = isSupported
      ? await vpn.getStatus()
      : { status: VpnStatus.UNSUPPORTED, isSupported: false };

    const pipe = await getPipeline();

    if (isSimulator) {
      await clearDatabase();
      const sim = createSimulator();
      const { apps } = sim.run();
      const networkEventsByApp = new Map<
        string,
        ReturnType<typeof generateEvents>['networkEvents']
      >();
      const securityEventsByApp = new Map<
        string,
        ReturnType<typeof generateEvents>['securityEvents']
      >();

      for (const app of apps) {
        const scenario = SCENARIO_MAP[app.id] ?? SimulatorScenario.NORMAL;
        const events = generateEvents(app.id, scenario);
        networkEventsByApp.set(app.id, events.networkEvents);
        securityEventsByApp.set(app.id, events.securityEvents);
      }

      const state = await seedSimulatorData(apps, networkEventsByApp, securityEventsByApp);
      const db = await getDatabase();
      const alerts = await loadAlerts(db);

      for (const alert of alerts.filter((a) => a.notifyImmediately && !a.acknowledged)) {
        await notifyForAlert(alert);
      }

      set({
        apps: state.apps,
        assessments: state.assessments,
        timeline: state.timeline,
        alerts,
        counts: computeRiskCounts(state.assessments),
        isLoading: false,
        isSimulator: true,
        vpnStatus,
        syncStatus: 'disabled',
        syncPendingCount: 0,
        onboardingComplete: onboarded,
        lastScanAt: new Date(),
      });
    } else {
      await syncInstalledAppsFromDevice(pipe);
      const state = await pipe.refreshState();
      const db = await getDatabase();
      const alerts = await loadAlerts(db);

      vpnSubscription?.remove();
      vpnSubscription = vpn.onNetworkEvent((payload) => {
        void pipe
          .handleNativeEvent(payload)
          .then(() => get().refreshFromDb())
          .then(() => runCloudSync(set));
      });

      pipe.startFlushTimer(() => {
        void get().refreshFromDb();
      });

      if (vpnStatsTimer) clearInterval(vpnStatsTimer);
      vpnStatsTimer = setInterval(() => {
        void vpn.getStatus().then((status) => set({ vpnStatus: status }));
      }, 10_000);

      await refreshSyncState(set);
      void runCloudSync(set);

      set({
        apps: state.apps,
        assessments: state.assessments,
        timeline: state.timeline,
        alerts,
        counts: computeRiskCounts(state.assessments),
        isLoading: false,
        isSimulator: false,
        vpnStatus,
        onboardingComplete: onboarded,
        lastScanAt: new Date(),
      });
    }
  },

  startMonitoring: async () => {
    const vpn = getGuardianVpnService();
    try {
      await vpn.start();
      const vpnStatus = await vpn.getStatus();
      set({ vpnStatus });
    } catch (error) {
      set({
        vpnStatus: {
          status: VpnStatus.ERROR,
          isSupported: await vpn.isSupported(),
          errorMessage: error instanceof Error ? error.message : 'Failed to start monitoring',
        },
      });
    }
  },

  stopMonitoring: async () => {
    const vpn = getGuardianVpnService();
    await vpn.stop();
    pipeline?.stopFlushTimer();
    if (vpnStatsTimer) clearInterval(vpnStatsTimer);
    vpnStatsTimer = null;
    const vpnStatus = await vpn.getStatus();
    set({ vpnStatus });
  },

  acknowledgeAlert: async (alertId: string) => {
    const alert = get().alerts.find((a) => a.id === alertId);
    if (!alert) return;
    const updated = applyAlertAction(alert, AlertAction.NONE);
    const acknowledged = { ...updated, acknowledged: true };
    const db = await getDatabase();
    await upsertAlert(db, acknowledged);
    set({ alerts: get().alerts.map((a) => (a.id === alertId ? acknowledged : a)) });
  },

  handleAlertAction: async (alertId: string, action: AlertAction) => {
    const alert = get().alerts.find((a) => a.id === alertId);
    if (!alert) return;
    const updated = applyAlertAction(alert, action);
    const db = await getDatabase();

    if (action === AlertAction.BLOCK && alert.domain) {
      const vpn = getGuardianVpnService();
      await vpn.blockDomain(alert.domain);
    }

    await upsertAlert(db, updated);
    set({ alerts: get().alerts.map((a) => (a.id === alertId ? updated : a)) });
  },

  toggleTechnicalDetails: () => {
    set({ showTechnicalDetails: !get().showTechnicalDetails });
  },

  trustApp: async (appId: string) => {
    const app = get().apps.find((a) => a.id === appId);
    if (!app || app.trustLevel === TrustLevel.TRUSTED) return;

    const trustedApp = { ...app, trustLevel: TrustLevel.TRUSTED };
    const db = await getDatabase();
    await upsertApp(db, trustedApp);

    const pipe = await getPipeline();
    await pipe.reassessApp(appId);
    await get().refreshFromDb();
  },

  runDemoScenario: async () => {
    await clearDatabase();
    const sim = createSimulator();
    const { apps } = sim.run();
    const networkEventsByApp = new Map<
      string,
      ReturnType<typeof generateEvents>['networkEvents']
    >();
    const securityEventsByApp = new Map<
      string,
      ReturnType<typeof generateEvents>['securityEvents']
    >();

    for (const app of apps) {
      const scenario =
        app.id === PHOTO_CLEANER_APP_ID
          ? SimulatorScenario.HIGH_RISK
          : (SCENARIO_MAP[app.id] ?? SimulatorScenario.NORMAL);
      const events = generateEvents(app.id, scenario);
      networkEventsByApp.set(app.id, events.networkEvents);
      securityEventsByApp.set(app.id, events.securityEvents);
    }

    const state = await seedSimulatorData(apps, networkEventsByApp, securityEventsByApp);
    const db = await getDatabase();
    const alerts = await loadAlerts(db);
    const suspicious = alerts.find((a) => a.appId === PHOTO_CLEANER_APP_ID);
    if (suspicious) {
      await notifyForAlert(suspicious);
    }

    set({
      apps: state.apps,
      assessments: state.assessments,
      timeline: state.timeline,
      alerts,
      counts: computeRiskCounts(state.assessments),
      isSimulator: true,
    });
  },
}));
