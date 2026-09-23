import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VpnStatus } from '@guardian/shared';
import { useGuardianStore } from '../store/guardian-store';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

export function VpnStatsBar() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const { vpnStatus, isSimulator } = useGuardianStore();

  if (isSimulator || vpnStatus.status !== VpnStatus.ACTIVE || !vpnStatus.stats) {
    return null;
  }

  const { packetsProcessed, eventsEmitted, blockedDomains } = vpnStatus.stats;

  return (
    <View style={styles.bar} accessibilityLiveRegion="polite">
      <Text style={[styles.text, rtl.text]}>
        {t('home.vpnStats', {
          packets: packetsProcessed,
          events: eventsEmitted,
          blocked: blockedDomains,
        })}
      </Text>
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
  text: { fontSize: 12, color: colors.textSecondary },
});
