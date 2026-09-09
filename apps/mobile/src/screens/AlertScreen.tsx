import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';

export function AlertScreen() {
  const { t } = useTranslation();
  const route = useRoute<RouteProp<RootStackParamList, 'Alert'>>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { alerts, acknowledgeAlert } = useGuardianStore();

  const alert = alerts.find((a) => a.id === route.params.alertId);

  if (!alert) {
    return (
      <View style={styles.container}>
        <Text>Alert not found</Text>
      </View>
    );
  }

  const handleAcknowledge = () => {
    acknowledgeAlert(alert.id);
    navigation.goBack();
  };

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <RiskBadge level={alert.level} />
        <Text style={styles.title}>{alert.title}</Text>
        <Text style={styles.message}>{alert.message}</Text>
      </View>

      <TouchableOpacity style={styles.button} onPress={handleAcknowledge}>
        <Text style={styles.buttonText}>{t('alert.acknowledge')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkButton}
        onPress={() => navigation.navigate('AppDetails', { appId: alert.appId })}
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
  },
  buttonText: { color: colors.white, fontSize: 16, fontWeight: '600' },
  linkButton: { marginTop: 16, alignItems: 'center' },
  linkText: { color: colors.primary, fontSize: 15 },
});
