import { useCallback, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { RiskLevel } from '@guardian/shared';
import { colors, getRiskColor } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { VpnStatusBar } from '../components/VpnStatusBar';
import { VpnStatsBar } from '../components/VpnStatsBar';
import { SyncStatusBar } from '../components/SyncStatusBar';
import { useRtl } from '../hooks/use-rtl';
import { showDevUi } from '../config/app-flags';

function formatLastScan(date: Date | null, locale: string): string {
  if (!date) return '';
  return date.toLocaleString(locale === 'he' ? 'he-IL' : 'en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function HomeScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const {
    counts,
    apps,
    alerts,
    timeline,
    isSimulator,
    runDemoScenario,
    refreshFromDb,
    lastScanAt,
  } = useGuardianStore();
  const rtl = useRtl();
  const [refreshing, setRefreshing] = useState(false);

  const unacknowledged = alerts.filter((a) => !a.acknowledged);
  const hasActivity = timeline.length > 0 || alerts.length > 0;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshFromDb();
    setRefreshing(false);
  }, [refreshFromDb]);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, rtl.container]}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} />}
    >
      <Text style={[styles.tagline, rtl.text]}>{t('app.tagline')}</Text>

      {lastScanAt && (
        <Text style={[styles.lastScan, rtl.text]}>
          {t('home.lastScan', { time: formatLastScan(lastScanAt, i18n.language) })}
        </Text>
      )}

      <VpnStatusBar />
      <VpnStatsBar />
      <SyncStatusBar />

      {showDevUi() && isSimulator && (
        <View style={styles.simBanner} accessibilityLiveRegion="polite">
          <Text style={[styles.simText, rtl.text]}>{t('home.demoMode')}</Text>
          <TouchableOpacity
            style={styles.demoButton}
            onPress={() => void runDemoScenario()}
            accessibilityRole="button"
            accessibilityLabel={t('home.runDemo')}
          >
            <Text style={styles.demoButtonText}>{t('home.runDemo')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.countsRow}>
        <CountCard
          label={t('home.safe')}
          count={counts.safe}
          color={getRiskColor(RiskLevel.SAFE)}
        />
        <CountCard
          label={t('home.unusual')}
          count={counts.unusual}
          color={getRiskColor(RiskLevel.UNUSUAL)}
        />
        <CountCard
          label={t('home.suspicious')}
          count={counts.suspicious}
          color={getRiskColor(RiskLevel.SUSPICIOUS)}
        />
      </View>

      {!hasActivity && (
        <View style={styles.emptyState} accessibilityRole="text">
          <Text style={[styles.emptyTitle, rtl.text]}>{t('home.emptyTitle')}</Text>
          <Text style={[styles.emptyBody, rtl.text]}>{t('home.emptyBody')}</Text>
        </View>
      )}

      <Text style={[styles.sectionTitle, rtl.text]}>
        {t('home.appsMonitored', { count: apps.length })}
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Apps')}>
        <Text style={styles.buttonText}>{t('home.viewApps')}</Text>
      </TouchableOpacity>

      {unacknowledged.length > 0 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, rtl.text]}>{t('home.recentActivity')}</Text>
          {unacknowledged.slice(0, 3).map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={[styles.alertCard, rtl.borderStart('#ef4444')]}
              onPress={() => navigation.navigate('Alert', { alertId: alert.id })}
            >
              <Text style={styles.alertTitle}>{alert.title}</Text>
              <Text style={styles.alertMessage} numberOfLines={2}>
                {alert.message}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Permissions')}
        accessibilityRole="button"
        accessibilityLabel={t('permissions.title')}
      >
        <Text style={styles.linkText}>{t('permissions.title')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Timeline')}
        accessibilityRole="button"
        accessibilityLabel={t('nav.timeline')}
      >
        <Text style={styles.linkText}>{t('nav.timeline')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('Settings')}
        accessibilityRole="button"
        accessibilityLabel={t('settings.title')}
      >
        <Text style={styles.linkText}>{t('settings.title')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function CountCard({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <View style={[styles.countCard, { borderTopColor: color }]}>
      <Text style={[styles.countNumber, { color }]}>{count}</Text>
      <Text style={styles.countLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  tagline: { fontSize: 16, color: colors.textSecondary, marginBottom: 8 },
  lastScan: { fontSize: 12, color: colors.textSecondary, marginBottom: 16 },
  simBanner: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  simText: { color: '#92400e', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  demoButton: {
    backgroundColor: '#d97706',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
  },
  demoButtonText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  countsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  countCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    borderTopWidth: 3,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  countNumber: { fontSize: 28, fontWeight: '700' },
  countLabel: { fontSize: 12, color: colors.textSecondary, marginTop: 4 },
  emptyState: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    alignItems: 'center',
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  emptyBody: { fontSize: 14, color: colors.textSecondary, textAlign: 'center', lineHeight: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  section: { marginTop: 24 },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 20, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 15 },
  alertCard: {
    backgroundColor: colors.card,
    padding: 16,
    borderRadius: 12,
    marginBottom: 10,
  },
  alertTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  alertMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
