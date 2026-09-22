import { Platform } from 'react-native';
import type { Alert } from '@guardian/shared';
import { RiskLevel } from '@guardian/shared';
import { getNotificationPolicy } from './alert-service';
import i18n from '../i18n';

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
        name: i18n.t('push.channelName'),
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
      });
    }

    initialized = true;
  } catch {
    // expo-notifications unavailable in Expo Go or unsupported platform
  }
}

/** Re-create the Android channel after the user changes language. */
export async function refreshNotificationChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  initialized = false;
  await initNotifications();
}

export async function notifyForAlert(alert: Alert): Promise<void> {
  const policy = getNotificationPolicy(alert.level);
  if (policy.silent || alert.level === RiskLevel.SAFE) return;

  try {
    const Notifications = await import('expo-notifications');
    await Notifications.scheduleNotificationAsync({
      content: {
        title: i18n.t('push.alertTitle', { name: alert.title }),
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
