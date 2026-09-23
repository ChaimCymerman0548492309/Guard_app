import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { VpnStatus } from '@guardian/shared';
import { useGuardianStore } from '../store/guardian-store';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

export function VpnStatusBar() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const { vpnStatus, isSimulator } = useGuardianStore();

  if (isSimulator) return null;

  const { status, isSupported, errorMessage } = vpnStatus;

  if (!isSupported) {
    return (
      <View
        style={[styles.bar, styles.unsupported, rtl.borderStart('#9ca3af')]}
        accessibilityLiveRegion="polite"
      >
        <View style={[styles.dot, styles.dotGray]} />
        <Text style={[styles.text, rtl.text]}>{t('home.vpnUnsupported')}</Text>
      </View>
    );
  }

  const isActive = status === VpnStatus.ACTIVE;
  const isStarting = status === VpnStatus.STARTING;
  const isError = status === VpnStatus.ERROR;

  const label = isActive
    ? t('home.vpnConnected')
    : isStarting
      ? t('home.vpnConnecting')
      : isError
        ? t('home.vpnError')
        : t('home.vpnDisconnected');

  return (
    <View
      style={[
        styles.bar,
        isActive && styles.active,
        isActive && rtl.borderStart('#22c55e'),
        isError && styles.error,
        isError && rtl.borderStart('#ef4444'),
        isStarting && styles.starting,
        isStarting && rtl.borderStart('#eab308'),
      ]}
      accessibilityRole="text"
      accessibilityLabel={label}
      accessibilityLiveRegion="polite"
    >
      <View
        style={[
          styles.dot,
          isActive && styles.dotGreen,
          isError && styles.dotRed,
          isStarting && styles.dotYellow,
          !isActive && !isError && !isStarting && styles.dotGray,
        ]}
      />
      <Text style={[styles.text, rtl.text]}>{label}</Text>
      {errorMessage && isError && (
        <Text style={[styles.errorDetail, rtl.text]} numberOfLines={2}>
          {errorMessage}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    gap: 8,
    flexWrap: 'wrap',
  },
  active: {},
  error: {},
  starting: {},
  unsupported: {},
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotGreen: { backgroundColor: '#22c55e' },
  dotRed: { backgroundColor: '#ef4444' },
  dotYellow: { backgroundColor: '#eab308' },
  dotGray: { backgroundColor: '#9ca3af' },
  text: { fontSize: 14, fontWeight: '600', color: colors.text, flex: 1 },
  errorDetail: { fontSize: 12, color: '#991b1b', width: '100%', marginLeft: 18 },
});
