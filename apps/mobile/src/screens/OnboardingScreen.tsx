import { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VpnStatus } from '@guardian/shared';
import { useGuardianStore } from '../store/guardian-store';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

const STEPS = ['welcome', 'privacy', 'monitoring', 'done'] as const;

export function OnboardingScreen() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const { vpnStatus, startMonitoring, isSimulator, completeOnboarding } = useGuardianStore();
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];
  const isLast = stepIndex === STEPS.length - 1;
  const isMonitoringStep = step === 'monitoring';
  const vpnActive = vpnStatus.status === VpnStatus.ACTIVE;

  const canAdvance =
    !isMonitoringStep || isSimulator || vpnActive || !vpnStatus.isSupported;

  const handleNext = () => {
    if (isLast) {
      void completeOnboarding();
      return;
    }
    setStepIndex((i) => i + 1);
  };

  const handleBack = () => {
    if (stepIndex > 0) setStepIndex((i) => i - 1);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[styles.content, rtl.container]}
    >
      <View style={styles.progressRow}>
        {STEPS.map((s, i) => (
          <View
            key={s}
            style={[styles.progressDot, i <= stepIndex && styles.progressDotActive]}
          />
        ))}
      </View>

      <Text style={[styles.title, rtl.text]} accessibilityRole="header">
        {t(`onboarding.${step}.title`)}
      </Text>
      <Text style={[styles.body, rtl.text]}>{t(`onboarding.${step}.body`)}</Text>

      {isMonitoringStep && !isSimulator && vpnStatus.isSupported && (
        <View style={styles.card}>
          <Text style={[styles.cardTitle, rtl.text]}>{t('permissions.vpnTitle')}</Text>
          <Text style={[styles.cardBody, rtl.text]}>{t('permissions.vpnBody')}</Text>
          {vpnStatus.errorMessage && (
            <Text style={styles.errorText}>{vpnStatus.errorMessage}</Text>
          )}
          <TouchableOpacity
            style={[styles.vpnButton, vpnActive && styles.vpnButtonActive]}
            onPress={() => void startMonitoring()}
            disabled={vpnActive}
            accessibilityRole="button"
            accessibilityLabel={t('permissions.start')}
          >
            <Text style={[styles.vpnButtonText, vpnActive && styles.vpnButtonTextActive]}>
              {vpnActive ? t('home.vpnConnected') : t('permissions.start')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {isMonitoringStep && isSimulator && (
        <View style={styles.info}>
          <Text style={styles.infoText}>{t('permissions.simulatorNote')}</Text>
        </View>
      )}

      <View style={[styles.actions, rtl.row]}>
        {stepIndex > 0 && (
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            accessibilityRole="button"
            accessibilityLabel={t('onboarding.back')}
          >
            <Text style={styles.backText}>{t('onboarding.back')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[styles.nextButton, !canAdvance && styles.nextButtonDisabled]}
          onPress={handleNext}
          disabled={!canAdvance}
          accessibilityRole="button"
          accessibilityLabel={isLast ? t('onboarding.finish') : t('onboarding.next')}
        >
          <Text style={styles.nextText}>
            {isLast ? t('onboarding.finish') : t('onboarding.next')}
          </Text>
        </TouchableOpacity>
      </View>

      {stepIndex < STEPS.length - 1 && (
        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => void completeOnboarding()}
          accessibilityRole="button"
          accessibilityLabel={t('onboarding.skip')}
        >
          <Text style={styles.skipText}>{t('onboarding.skip')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, flexGrow: 1, justifyContent: 'center' },
  progressRow: { flexDirection: 'row', gap: 8, marginBottom: 32, justifyContent: 'center' },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.textSecondary + '40',
  },
  progressDotActive: { backgroundColor: colors.primary },
  title: { fontSize: 26, fontWeight: '700', color: colors.text, marginBottom: 16 },
  body: { fontSize: 16, color: colors.textSecondary, lineHeight: 24, marginBottom: 32 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  cardBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20, marginBottom: 16 },
  errorText: { color: '#991b1b', fontSize: 13, marginBottom: 12 },
  vpnButton: {
    backgroundColor: colors.primary,
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  vpnButtonActive: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
  vpnButtonText: { color: colors.white, fontWeight: '600', fontSize: 15 },
  vpnButtonTextActive: { color: colors.primary },
  info: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginBottom: 24,
  },
  infoText: { color: '#92400e', fontSize: 14, textAlign: 'center' },
  actions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  backButton: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  backText: { color: colors.primary, fontWeight: '600', fontSize: 16 },
  nextButton: {
    flex: 2,
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  nextButtonDisabled: { opacity: 0.5 },
  nextText: { color: colors.white, fontWeight: '600', fontSize: 16 },
  skipButton: { marginTop: 24, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  skipText: { color: colors.textSecondary, fontSize: 14 },
});
