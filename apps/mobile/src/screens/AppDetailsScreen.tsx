import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import { TrustLevel } from '@guardian/shared';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useRtl } from '../hooks/use-rtl';

export function AppDetailsScreen() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const route = useRoute<RouteProp<RootStackParamList, 'AppDetails'>>();
  const { apps, assessments, showTechnicalDetails, toggleTechnicalDetails, trustApp } =
    useGuardianStore();

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
      contentContainerStyle={[styles.content, rtl.container]}
      accessibilityLabel={`${app.displayName} ${t('appDetails.title')}`}
    >
      <Text style={[styles.appName, rtl.text]} accessibilityRole="header">
        {app.displayName}
      </Text>
      <Text style={[styles.packageName, rtl.text]}>{app.packageName}</Text>

      {app.trustLevel === TrustLevel.TRUSTED ? (
        <Text style={[styles.trustedNote, rtl.text]} accessibilityRole="text">
          {t('appDetails.trusted')}
        </Text>
      ) : (
        <TouchableOpacity
          onPress={() => void trustApp(app.id)}
          style={styles.trustButton}
          accessibilityRole="button"
          accessibilityLabel={t('appDetails.trustApp')}
        >
          <Text style={styles.trustButtonText}>{t('appDetails.trustApp')}</Text>
        </TouchableOpacity>
      )}

      {assessment && (
        <>
          <View style={[styles.row, rtl.row]}>
            <Text style={[styles.label, rtl.text]}>{t('appDetails.riskLevel')}</Text>
            <RiskBadge level={assessment.level} />
          </View>

          <Text style={[styles.sectionTitle, rtl.text]}>{t('appDetails.explanation')}</Text>
          <Text style={[styles.explanation, rtl.text]}>{assessment.explanation}</Text>

          {assessment.triggeredRules.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, rtl.text]}>{t('appDetails.rulesTriggered')}</Text>
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
              <Text style={styles.techLine}>
                {t('appDetails.score')}: {assessment.score}
              </Text>
              <Text style={styles.techLine}>
                {t('appDetails.assessedAt')}: {new Date(assessment.assessedAt).toLocaleString()}
              </Text>
              <Text style={styles.techLine}>
                {t('appDetails.appId')}: {app.id}
              </Text>
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
  packageName: { fontSize: 13, color: colors.textSecondary, marginBottom: 16 },
  trustButton: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    alignSelf: 'flex-start',
    marginBottom: 24,
    minHeight: 44,
    justifyContent: 'center',
  },
  trustButtonText: { color: colors.white, fontSize: 15, fontWeight: '600' },
  trustedNote: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: 24,
    fontStyle: 'italic',
  },
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
