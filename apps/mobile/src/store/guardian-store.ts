import { create } from 'zustand';
import type { App, RiskAssessment, RiskCounts, Alert } from '@guardian/shared';
import { createSimulator } from '@guardian/simulator';
import { getDatabase, clearDatabase } from '../db/database';

interface GuardianState {
  apps: App[];
  assessments: RiskAssessment[];
  counts: RiskCounts;
  alerts: Alert[];
  isLoading: boolean;
  isSimulator: boolean;
  loadData: () => Promise<void>;
  acknowledgeAlert: (alertId: string) => void;
}

function buildAlerts(apps: App[], assessments: RiskAssessment[]): Alert[] {
  return assessments
    .filter((a) => a.level !== 'SAFE')
    .map((a) => {
      const app = apps.find((ap) => ap.id === a.appId);
      return {
        id: `alert-${a.id}`,
        appId: a.appId,
        riskAssessmentId: a.id,
        title: app?.displayName ?? 'Unknown App',
        message: a.explanation,
        level: a.level,
        acknowledged: false,
        createdAt: a.assessedAt,
      };
    });
}

async function persistToSQLite(
  apps: App[],
  assessments: RiskAssessment[],
  alerts: Alert[],
): Promise<void> {
  const db = await getDatabase();
  await clearDatabase();

  for (const app of apps) {
    await db.runAsync(
      'INSERT INTO apps (id, package_name, display_name, category, is_system, trust_level) VALUES (?, ?, ?, ?, ?, ?)',
      [
        app.id,
        app.packageName,
        app.displayName,
        app.category,
        app.isSystem ? 1 : 0,
        app.trustLevel,
      ],
    );
  }

  for (const a of assessments) {
    await db.runAsync(
      'INSERT INTO risk_assessments (id, app_id, score, level, triggered_rules, explanation, assessed_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [
        a.id,
        a.appId,
        a.score,
        a.level,
        JSON.stringify(a.triggeredRules),
        a.explanation,
        a.assessedAt.toISOString(),
      ],
    );
  }

  for (const alert of alerts) {
    await db.runAsync(
      'INSERT INTO alerts (id, app_id, risk_assessment_id, title, message, level, acknowledged, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [
        alert.id,
        alert.appId,
        alert.riskAssessmentId,
        alert.title,
        alert.message,
        alert.level,
        alert.acknowledged ? 1 : 0,
        alert.createdAt.toISOString(),
      ],
    );
  }
}

export const useGuardianStore = create<GuardianState>((set, get) => ({
  apps: [],
  assessments: [],
  counts: { safe: 0, unusual: 0, suspicious: 0 },
  alerts: [],
  isLoading: true,
  isSimulator: process.env.EXPO_PUBLIC_DEV_SIMULATOR !== 'false',

  loadData: async () => {
    set({ isLoading: true });
    const isSimulator = process.env.EXPO_PUBLIC_DEV_SIMULATOR !== 'false';

    if (isSimulator) {
      const sim = createSimulator();
      const { apps, assessments, counts } = sim.run();
      const alerts = buildAlerts(apps, assessments);
      await persistToSQLite(apps, assessments, alerts);
      set({ apps, assessments, counts, alerts, isLoading: false, isSimulator: true });
    } else {
      set({ isLoading: false, isSimulator: false });
    }
  },

  acknowledgeAlert: (alertId: string) => {
    const alerts = get().alerts.map((a) => (a.id === alertId ? { ...a, acknowledged: true } : a));
    set({ alerts });
  },
}));
