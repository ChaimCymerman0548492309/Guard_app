import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { VpnStatus } from '@guardian/shared';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function PermissionsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { vpnStatus, startMonitoring, stopMonitoring, isSimulator } = useGuardianStore();
  const isActive = vpnStatus.status === VpnStatus.ACTIVE;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      accessibilityLabel={t('permissions.title')}
    >
      <Text style={styles.heading} accessibilityRole="header">
        {t('permissions.heading')}
      </Text>
      <Text style={styles.body}>{t('permissions.explanation')}</Text>

      <View style={styles.card} accessibilityRole="summary">
        <Text style={styles.cardTitle}>{t('permissions.vpnTitle')}</Text>
        <Text style={styles.cardBody}>{t('permissions.vpnBody')}</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>{t('permissions.notificationsTitle')}</Text>
        <Text style={styles.cardBody}>{t('permissions.notificationsBody')}</Text>
      </View>

      {!vpnStatus.isSupported && !isSimulator && (
        <View style={styles.warning} accessibilityLiveRegion="polite">
          <Text style={styles.warningText}>{t('permissions.unsupported')}</Text>
        </View>
      )}

      {vpnStatus.errorMessage && (
        <View style={styles.warning}>
          <Text style={styles.warningText}>{vpnStatus.errorMessage}</Text>
        </View>
      )}

      {!isSimulator && vpnStatus.isSupported && (
        <TouchableOpacity
          style={[styles.button, isActive && styles.buttonSecondary]}
          onPress={() => void (isActive ? stopMonitoring() : startMonitoring())}
          accessibilityRole="button"
          accessibilityLabel={isActive ? t('permissions.stop') : t('permissions.start')}
          accessibilityHint={t('permissions.startHint')}
        >
          <Text style={[styles.buttonText, isActive && styles.buttonTextSecondary]}>
            {isActive ? t('permissions.stop') : t('permissions.start')}
          </Text>
        </TouchableOpacity>
      )}

      {isSimulator && (
        <View style={styles.info}>
          <Text style={styles.infoText}>{t('permissions.simulatorNote')}</Text>
        </View>
      )}

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.goBack()}
        accessibilityRole="button"
        accessibilityLabel={t('permissions.continue')}
      >
        <Text style={styles.linkText}>{t('permissions.continue')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  heading: { fontSize: 22, fontWeight: '700', color: colors.text, marginBottom: 12 },
  body: { fontSize: 15, color: colors.textSecondary, lineHeight: 22, marginBottom: 24 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  cardTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 8 },
  cardBody: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  warning: {
    backgroundColor: '#fef2f2',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  warningText: { color: '#991b1b', fontSize: 14 },
  info: {
    backgroundColor: '#fef3c7',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  infoText: { color: '#92400e', fontSize: 14, textAlign: 'center' },
  button: {
    backgroundColor: colors.primary,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonSecondary: { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.primary },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  buttonTextSecondary: { color: colors.primary },
  linkButton: { marginTop: 24, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 15 },
});
