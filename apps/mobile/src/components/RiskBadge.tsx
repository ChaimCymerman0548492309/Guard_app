import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RiskLevel } from '@guardian/shared';
import { getRiskColor } from '../theme';

interface RiskBadgeProps {
  level: RiskLevel;
}

export function RiskBadge({ level }: RiskBadgeProps) {
  const { t } = useTranslation();
  const color = getRiskColor(level);

  return (
    <View style={[styles.badge, { backgroundColor: color + '20', borderColor: color }]}>
      <Text style={[styles.text, { color }]}>{t(`risk.${level}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 13,
    fontWeight: '600',
  },
});
