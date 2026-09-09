import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGuardianStore } from '../store/guardian-store';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

export function SyncStatusBar() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const { syncStatus, syncPendingCount, isSimulator } = useGuardianStore();

  if (isSimulator || syncStatus === 'disabled') {
    return null;
  }

  const label =
    syncStatus === 'syncing'
      ? t('home.syncSyncing', { count: syncPendingCount })
      : syncStatus === 'offline'
        ? t('home.syncOffline', { count: syncPendingCount })
        : syncStatus === 'error'
          ? t('home.syncError', { count: syncPendingCount })
          : t('home.syncIdle');

  return (
    <View style={[styles.bar]} accessibilityLiveRegion="polite">
      <Text style={[styles.text, rtl.text]}>{label}</Text>
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
  text: { fontSize: 13, color: colors.textSecondary },
});
