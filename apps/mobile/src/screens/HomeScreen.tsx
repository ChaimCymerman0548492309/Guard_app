import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { RiskLevel } from '@guardian/shared';
import { colors, getRiskColor } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function HomeScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { counts, apps, alerts, isSimulator } = useGuardianStore();

  const unacknowledged = alerts.filter((a) => !a.acknowledged);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.tagline}>{t('app.tagline')}</Text>

      {isSimulator && (
        <View style={styles.simBanner} accessibilityLiveRegion="polite">
          <Text style={styles.simText}>{t('home.demoMode')}</Text>
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

      <Text style={styles.sectionTitle}>
        {t('home.appsMonitored')}: {apps.length}
      </Text>

      <TouchableOpacity style={styles.button} onPress={() => navigation.navigate('Apps')}>
        <Text style={styles.buttonText}>{t('home.viewApps')}</Text>
      </TouchableOpacity>

      {unacknowledged.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('home.recentActivity')}</Text>
          {unacknowledged.slice(0, 3).map((alert) => (
            <TouchableOpacity
              key={alert.id}
              style={styles.alertCard}
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
  tagline: { fontSize: 16, color: colors.textSecondary, marginBottom: 20 },
  simBanner: {
    backgroundColor: '#fef3c7',
    padding: 10,
    borderRadius: 8,
    marginBottom: 16,
  },
  simText: { color: '#92400e', fontSize: 13, textAlign: 'center' },
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
    borderLeftWidth: 4,
    borderLeftColor: '#ef4444',
  },
  alertTitle: { fontSize: 15, fontWeight: '600', color: colors.text },
  alertMessage: { fontSize: 13, color: colors.textSecondary, marginTop: 4 },
});
