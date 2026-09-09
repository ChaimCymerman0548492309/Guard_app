import type { NativeNetworkEventPayload, NetworkEvent } from '@guardian/shared';
import { NetworkDirection, NetworkProtocol } from '@guardian/shared';

export interface AggregatedNetworkEvent {
  key: string;
  appId: string;
  packageName: string;
  domain: string;
  bytesSent: number;
  bytesReceived: number;
  protocol: NetworkProtocol;
  count: number;
  firstTimestamp: Date;
  lastTimestamp: Date;
}

export interface AggregationOptions {
  windowMs?: number;
  maxPending?: number;
}

const DEFAULT_WINDOW_MS = 60_000;
const DEFAULT_MAX_PENDING = 500;

/**
 * Buffers and aggregates network events to avoid UI spam (section 33).
 * Events with the same app+domain within the window are merged.
 */
export class EventAggregator {
  private pending = new Map<string, AggregatedNetworkEvent>();
  private windowMs: number;
  private maxPending: number;

  constructor(options: AggregationOptions = {}) {
    this.windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
    this.maxPending = options.maxPending ?? DEFAULT_MAX_PENDING;
  }

  ingest(
    payload: NativeNetworkEventPayload,
    appId: string,
  ): { aggregated: NetworkEvent | null; flushed: NetworkEvent[] } {
    const key = `${appId}:${payload.domain}:${payload.protocol}`;
    const now = new Date(payload.timestamp);
    const existing = this.pending.get(key);

    if (existing && now.getTime() - existing.lastTimestamp.getTime() < this.windowMs) {
      existing.bytesSent += payload.bytesSent;
      existing.bytesReceived += payload.bytesReceived;
      existing.count += 1;
      existing.lastTimestamp = now;
      return { aggregated: null, flushed: [] };
    }

    const flushed: NetworkEvent[] = [];
    if (existing) {
      flushed.push(this.toNetworkEvent(existing, false));
      this.pending.delete(key);
    }

    this.pending.set(key, {
      key,
      appId,
      packageName: payload.packageName,
      domain: payload.domain,
      bytesSent: payload.bytesSent,
      bytesReceived: payload.bytesReceived,
      protocol: payload.protocol,
      count: 1,
      firstTimestamp: now,
      lastTimestamp: now,
    });

    if (this.pending.size > this.maxPending) {
      flushed.push(...this.flushOldest(Math.floor(this.maxPending / 10)));
    }

    return { aggregated: null, flushed };
  }

  flushExpired(reference = new Date()): NetworkEvent[] {
    const flushed: NetworkEvent[] = [];
    for (const [key, agg] of this.pending.entries()) {
      if (reference.getTime() - agg.lastTimestamp.getTime() >= this.windowMs) {
        flushed.push(this.toNetworkEvent(agg, false));
        this.pending.delete(key);
      }
    }
    return flushed;
  }

  flushAll(): NetworkEvent[] {
    const flushed = [...this.pending.values()].map((agg) => this.toNetworkEvent(agg, false));
    this.pending.clear();
    return flushed;
  }

  private flushOldest(count: number): NetworkEvent[] {
    const sorted = [...this.pending.entries()].sort(
      (a, b) => a[1].lastTimestamp.getTime() - b[1].lastTimestamp.getTime(),
    );
    const flushed: NetworkEvent[] = [];
    for (const [key, agg] of sorted.slice(0, count)) {
      flushed.push(this.toNetworkEvent(agg, false));
      this.pending.delete(key);
    }
    return flushed;
  }

  private toNetworkEvent(agg: AggregatedNetworkEvent, isNewDomain: boolean): NetworkEvent {
    return {
      id: `net-${agg.key}-${agg.lastTimestamp.getTime()}`,
      appId: agg.appId,
      domain: agg.domain,
      bytesSent: agg.bytesSent,
      bytesReceived: agg.bytesReceived,
      isNewDomain,
      timestamp: agg.lastTimestamp,
      protocol: agg.protocol,
      direction:
        agg.bytesSent >= agg.bytesReceived ? NetworkDirection.OUTBOUND : NetworkDirection.INBOUND,
      packageName: agg.packageName,
    };
  }
}
