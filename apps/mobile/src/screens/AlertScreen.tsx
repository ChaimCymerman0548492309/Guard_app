import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { AlertAction, RiskLevel } from '@guardian/shared';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { useRtl } from '../hooks/use-rtl';

export function AlertScreen() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const route = useRoute<RouteProp<RootStackParamList, 'Alert'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { alerts, acknowledgeAlert, handleAlertAction } = useGuardianStore();

  const alert = alerts.find((a) => a.id === route.params.alertId);

  if (!alert) {
    return (
      <View style={styles.container}>
        <Text accessibilityRole="alert">{t('alert.notFound')}</Text>
      </View>
    );
  }

  const showBlock = alert.level === RiskLevel.SUSPICIOUS;

  return (
    <View style={[styles.container, rtl.container]} accessibilityLabel={t('alert.title')}>
      <View style={styles.card} accessibilityRole="summary">
        <RiskBadge level={alert.level} />
        <Text style={[styles.title, rtl.text]} accessibilityRole="header">
          {alert.title}
        </Text>
        <Text style={[styles.message, rtl.text]}>{alert.message}</Text>
      </View>

      <TouchableOpacity
        style={styles.button}
        onPress={() => void acknowledgeAlert(alert.id)}
        accessibilityRole="button"
        accessibilityLabel={t('alert.acknowledge')}
      >
        <Text style={styles.buttonText}>{t('alert.acknowledge')}</Text>
      </TouchableOpacity>

      {showBlock && (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.blockButton]}
            onPress={() => void handleAlertAction(alert.id, AlertAction.BLOCK)}
            accessibilityRole="button"
            accessibilityLabel={t('alert.block')}
          >
            <Text style={styles.blockText}>{t('alert.block')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => void handleAlertAction(alert.id, AlertAction.ALLOW)}
            accessibilityRole="button"
            accessibilityLabel={t('alert.allow')}
          >
            <Text style={styles.actionText}>{t('alert.allow')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => void handleAlertAction(alert.id, AlertAction.IGNORE)}
            accessibilityRole="button"
            accessibilityLabel={t('alert.ignore')}
          >
            <Text style={styles.actionText}>{t('alert.ignore')}</Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('AppDetails', { appId: alert.appId })}
        accessibilityRole="button"
        accessibilityLabel={t('alert.learnMore')}
      >
        <Text style={styles.linkText}>{t('alert.learnMore')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background, padding: 20 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 24,
    marginTop: 20,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  title: { fontSize: 22, fontWeight: '700', color: colors.text, marginTop: 16 },
  message: { fontSize: 16, color: colors.textSecondary, marginTop: 12, lineHeight: 24 },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 32,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  actions: { marginTop: 16, gap: 10 },
  actionButton: {
    padding: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    minHeight: 48,
    justifyContent: 'center',
  },
  blockButton: { borderColor: '#ef4444' },
  blockText: { color: '#ef4444', fontWeight: '600', fontSize: 15 },
  actionText: { color: colors.primary, fontSize: 15, fontWeight: '500' },
  linkButton: { marginTop: 16, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 15 },
});
