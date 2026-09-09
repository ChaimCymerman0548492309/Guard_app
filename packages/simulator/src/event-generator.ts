import { randomUUID } from 'node:crypto';
import { SecurityEventType, SimulatorScenario } from '@guardian/shared';
import type { NetworkEvent, SecurityEvent } from '@guardian/shared';
import { PHOTO_CLEANER_APP_ID } from './seed-data.js';

export interface GeneratedEvents {
  networkEvents: NetworkEvent[];
  securityEvents: SecurityEvent[];
}

function now(): Date {
  return new Date();
}

export function generateEvents(appId: string, scenario: SimulatorScenario): GeneratedEvents {
  switch (scenario) {
    case SimulatorScenario.NORMAL:
      return generateNormalEvents(appId);
    case SimulatorScenario.UNUSUAL:
      return generateUnusualEvents(appId);
    case SimulatorScenario.HIGH_RISK:
      return generateHighRiskEvents(appId);
    default:
      return generateNormalEvents(appId);
  }
}

function generateNormalEvents(appId: string): GeneratedEvents {
  return {
    networkEvents: [
      {
        id: randomUUID(),
        appId,
        domain: 'api.example.com',
        bytesSent: 1024,
        bytesReceived: 4096,
        isNewDomain: false,
        timestamp: now(),
      },
    ],
    securityEvents: [],
  };
}

function generateUnusualEvents(appId: string): GeneratedEvents {
  const events: NetworkEvent[] = [];
  for (let i = 0; i < 55; i++) {
    events.push({
      id: randomUUID(),
      appId,
      domain: `cdn-${i}.example.com`,
      bytesSent: 50000,
      bytesReceived: 100000,
      isNewDomain: i > 40,
      timestamp: now(),
    });
  }
  return { networkEvents: events, securityEvents: [] };
}

function generateHighRiskEvents(appId: string): GeneratedEvents {
  const isPhotoCleaner = appId === PHOTO_CLEANER_APP_ID;

  const networkEvents: NetworkEvent[] = [
    {
      id: randomUUID(),
      appId,
      domain: 'unknown-upload-server.xyz',
      bytesSent: 350 * 1024 * 1024,
      bytesReceived: 512,
      isNewDomain: true,
      timestamp: now(),
    },
    {
      id: randomUUID(),
      appId,
      domain: 'ads.doubleclick.net',
      bytesSent: 2048,
      bytesReceived: 1024,
      isNewDomain: false,
      timestamp: now(),
    },
  ];

  const securityEvents: SecurityEvent[] = isPhotoCleaner
    ? [
        {
          id: randomUUID(),
          appId,
          type: SecurityEventType.PHOTO_ACCESS,
          timestamp: now(),
          metadata: { photoCount: 1200 },
        },
      ]
    : [
        {
          id: randomUUID(),
          appId,
          type: SecurityEventType.CONTACT_ACCESS,
          timestamp: now(),
          metadata: { contactCount: 500 },
        },
      ];

  return { networkEvents, securityEvents };
}
