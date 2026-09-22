import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGuardianStore } from '../store/guardian-store';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

export function SyncStatusBar() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const { syncStatus, syncPendingCount, syncError } = useGuardianStore();

  if (syncStatus === 'disabled') {
    return null;
  }

  let label: string;
  if (syncError === 'Cloud login required') {
    label = t('settings.cloudLoginRequiredSync');
  } else if (syncStatus === 'syncing') {
    label = t('home.syncSyncing', { count: syncPendingCount });
  } else if (syncStatus === 'offline') {
    label = t('home.syncOffline', { count: syncPendingCount });
  } else if (syncStatus === 'error') {
    label = syncError
      ? t('home.syncError', { count: syncPendingCount })
      : t('home.syncError', { count: syncPendingCount });
  } else {
    label = t('home.syncIdle');
  }

  const isProblem = syncStatus === 'error' || syncStatus === 'offline' || Boolean(syncError);

  return (
    <View
      style={[styles.bar, isProblem && styles.barWarning]}
      accessibilityLiveRegion="polite"
      accessibilityRole="alert"
    >
      <Text style={[styles.text, rtl.text, isProblem && styles.textWarning]}>{label}</Text>
      {syncError && syncError !== 'Cloud login required' && (
        <Text style={[styles.detail, rtl.text]}>{syncError}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    backgroundColor: colors.card,
    padding: 10,
    borderRadius: 8,
    marginBottom: 12,
  },
  barWarning: {
    backgroundColor: '#fef2f2',
  },
  text: { fontSize: 13, color: colors.textSecondary },
  textWarning: { color: '#991b1b', fontWeight: '600' },
  detail: { fontSize: 12, color: '#991b1b', marginTop: 4 },
});
