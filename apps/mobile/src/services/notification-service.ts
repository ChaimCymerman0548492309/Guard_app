import { Platform } from 'react-native';
import type { Alert } from '@guardian/shared';
import { RiskLevel } from '@guardian/shared';
import { getNotificationPolicy } from './alert-service';

let initialized = false;

export async function initNotifications(): Promise<void> {
  if (initialized || Platform.OS === 'web') return;

  try {
    const Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('guardian-alerts', {
        name: 'Security Alerts',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    initialized = true;
  } catch {
    // expo-notifications unavailable in Expo Go or unsupported platform
  }
}

export async function notifyForAlert(alert: Alert): Promise<void> {
  const policy = getNotificationPolicy(alert.level);
  if (policy.silent || alert.level === RiskLevel.SAFE) return;

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: alert.title,
        body: alert.message,
        data: { alertId: alert.id },
        ...(Platform.OS === 'android' ? { channelId: 'guardian-alerts' } : {}),
      },
      trigger: null,
    });
  } catch {
    // Best-effort; notifications require device permissions
  }
}
