import { RiskDetector } from '@guardian/risk-engine';
import { SimulatorScenario } from '@guardian/shared';
import type { App, RiskAssessment, RiskCounts } from '@guardian/shared';
import { SEED_APPS } from './seed-data.js';
import { generateEvents } from './event-generator.js';

export interface SimulatorResult {
  apps: App[];
  assessments: RiskAssessment[];
  counts: RiskCounts;
}

const SCENARIO_MAP: Record<string, SimulatorScenario> = {
  'app-whatsapp': SimulatorScenario.NORMAL,
  'app-google-photos': SimulatorScenario.NORMAL,
  'app-photo-editor': SimulatorScenario.HIGH_RISK,
  'app-calculator': SimulatorScenario.NORMAL,
  'app-unknown': SimulatorScenario.UNUSUAL,
};

function scenarioForApp(appId: string): SimulatorScenario {
  return SCENARIO_MAP[appId] ?? SimulatorScenario.NORMAL;
}

export class GuardianSimulator {
  private detector = new RiskDetector();

  isEnabled(): boolean {
    return process.env.DEV_SIMULATOR === 'true';
  }

  run(): SimulatorResult {
    const apps = SEED_APPS;
    const assessments: RiskAssessment[] = [];

    for (const app of apps) {
      const scenario = scenarioForApp(app.id);
      const { networkEvents, securityEvents } = generateEvents(app.id, scenario);
      const assessment = this.detector.assess({
        appId: app.id,
        networkEvents,
        securityEvents,
      });
      assessments.push(assessment);
    }

    const counts: RiskCounts = { safe: 0, unusual: 0, suspicious: 0 };
    for (const a of assessments) {
      switch (a.level) {
        case 'SAFE':
          counts.safe++;
          break;
        case 'UNUSUAL':
          counts.unusual++;
          break;
        case 'SUSPICIOUS':
          counts.suspicious++;
          break;
      }
    }

    return { apps, assessments, counts };
  }
}

export function createSimulator(): GuardianSimulator {
  return new GuardianSimulator();
}
