import { describe, it, expect } from 'vitest';
import { EventAggregator } from './event-aggregator';
import { NetworkDirection, NetworkProtocol } from '@guardian/shared';

describe('EventAggregator', () => {
  it('merges events for same app+domain within window', () => {
    const aggregator = new EventAggregator({ windowMs: 60_000 });
    const base = {
      packageName: 'com.example.app',
      domain: 'example.com',
      direction: NetworkDirection.OUTBOUND,
      protocol: NetworkProtocol.TCP,
    };

    const first = aggregator.ingest(
      { id: '1', ...base, bytesSent: 100, bytesReceived: 0, timestamp: 1000 },
      'app-1',
    );
    expect(first.flushed).toHaveLength(0);

    const second = aggregator.ingest(
      { id: '2', ...base, bytesSent: 200, bytesReceived: 50, timestamp: 2000 },
      'app-1',
    );
    expect(second.flushed).toHaveLength(0);

    const flushed = aggregator.flushAll();
    expect(flushed).toHaveLength(1);
    expect(flushed[0].bytesSent).toBe(300);
    expect(flushed[0].bytesReceived).toBe(50);
  });

  it('flushes expired buckets', () => {
    const aggregator = new EventAggregator({ windowMs: 1000 });
    aggregator.ingest(
      {
        id: '1',
        packageName: 'com.test',
        domain: 'a.com',
        bytesSent: 10,
        bytesReceived: 0,
        direction: NetworkDirection.OUTBOUND,
        protocol: NetworkProtocol.UDP,
        timestamp: 0,
      },
      'app-1',
    );

    const flushed = aggregator.flushExpired(new Date(5000));
    expect(flushed).toHaveLength(1);
    expect(flushed[0].domain).toBe('a.com');
  });
});
