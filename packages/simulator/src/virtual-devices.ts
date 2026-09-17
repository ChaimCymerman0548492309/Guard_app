export interface VirtualDeviceSeed {
  id: string;
  name: string;
  platform: 'simulator' | 'android' | 'ios';
}

/** Pre-seeded virtual devices for DEV_SIMULATOR / dev lab mode. */
export const VIRTUAL_DEVICE_SEEDS: VirtualDeviceSeed[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    name: 'Virtual Demo Phone',
    platform: 'simulator',
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    name: 'Android Emulator',
    platform: 'android',
  },
  {
    id: '00000000-0000-4000-8000-000000000003',
    name: 'Lab Test Device',
    platform: 'android',
  },
];

export const DEFAULT_VIRTUAL_DEVICE_ID = VIRTUAL_DEVICE_SEEDS[0].id;

export function isKnownVirtualDeviceId(deviceId: string): boolean {
  return VIRTUAL_DEVICE_SEEDS.some((device) => device.id === deviceId);
}
