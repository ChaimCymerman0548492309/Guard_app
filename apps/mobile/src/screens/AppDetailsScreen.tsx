import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
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
  const { apps, assessments, showTechnicalDetails, toggleTechnicalDetails } = useGuardianStore();

  const app = apps.find((a) => a.id === route.params.appId);
  const assessment = assessments.find((a) => a.appId === route.params.appId);

  if (!app) {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="alert">{t('apps.noApps')}</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel={`${app.displayName} ${t('appDetails.title')}`}
    >
      <Text style={styles.appName} accessibilityRole="header">
        {app.displayName}
      </Text>
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
                <View key={rule} style={styles.ruleChip} accessibilityLabel={formatRule(rule)}>
                  <Text style={styles.ruleText}>{formatRule(rule)}</Text>
                </View>
              ))}
            </>
          )}

          <TouchableOpacity
            onPress={toggleTechnicalDetails}
            style={styles.techToggle}
            accessibilityRole="button"
            accessibilityLabel={t('appDetails.showTechnical')}
            accessibilityState={{ expanded: showTechnicalDetails }}
          >
            <Text style={styles.techToggleText}>
              {showTechnicalDetails ? t('appDetails.hideTechnical') : t('appDetails.showTechnical')}
            </Text>
          </TouchableOpacity>

          {showTechnicalDetails && (
            <View style={styles.techBox} accessibilityRole="text">
              <Text style={styles.techLine}>{t('appDetails.score')}: {assessment.score}</Text>
              <Text style={styles.techLine}>
                {t('appDetails.assessedAt')}: {new Date(assessment.assessedAt).toLocaleString()}
              </Text>
              <Text style={styles.techLine}>{t('appDetails.appId')}: {app.id}</Text>
              <Text style={styles.techLine}>
                {t('appDetails.rules')}: {assessment.triggeredRules.join(', ') || '—'}
              </Text>
            </View>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  explanation: { fontSize: 15, color: colors.text, lineHeight: 22 },
  ruleChip: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    minHeight: 44,
    justifyContent: 'center',
  },
  ruleText: { fontSize: 13, color: '#991b1b' },
  techToggle: { marginTop: 24, minHeight: 44, justifyContent: 'center' },
  techToggleText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  techBox: {
    marginTop: 12,
    padding: 12,
    backgroundColor: '#f3f4f6',
    borderRadius: 8,
  },
  techLine: { fontSize: 12, color: colors.textSecondary, marginBottom: 4, fontFamily: 'monospace' },
});
