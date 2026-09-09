import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function AppDetailsScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'AppDetails'>>();
  const { apps, assessments } = useGuardianStore();

  const app = apps.find((a) => a.id === route.params.appId);
  const assessment = assessments.find((a) => a.appId === route.params.appId);

  if (!app) {
    return (
      <View style={styles.container}>
        <Text>App not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.appName}>{app.displayName}</Text>
      <Text style={styles.packageName}>{app.packageName}</Text>

      {assessment && (
        <>
          <View style={styles.row}>
            <Text style={styles.label}>{t('appDetails.riskLevel')}</Text>
            <RiskBadge level={assessment.level} />
          </View>

          <Text style={styles.sectionTitle}>{t('appDetails.explanation')}</Text>
          <Text style={styles.explanation}>{assessment.explanation}</Text>

          {assessment.triggeredRules.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>{t('appDetails.rulesTriggered')}</Text>
              {assessment.triggeredRules.map((rule) => (
                <View key={rule} style={styles.ruleChip}>
                  <Text style={styles.ruleText}>{formatRule(rule)}</Text>
                </View>
              ))}
            </>
          )}
        </>
      )}
    </ScrollView>
  );
}

function formatRule(rule: string): string {
  return rule
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  appName: { fontSize: 24, fontWeight: '700', color: colors.text },
  packageName: { fontSize: 13, color: colors.textSecondary, marginBottom: 24 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  label: { fontSize: 15, color: colors.textSecondary },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginTop: 16, marginBottom: 8 },
  explanation: { fontSize: 15, color: colors.text, lineHeight: 22 },
  ruleChip: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
  },
  ruleText: { fontSize: 13, color: '#991b1b' },
});
