import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

export function TimelineScreen() {
  const { t, i18n } = useTranslation();
  const rtl = useRtl();
  const { timeline, apps } = useGuardianStore();

  const items = timeline.map((item) => {
    const app = apps.find((ap) => ap.id === item.appId);
    return { ...item, appName: app?.displayName ?? t('apps.unknownApp') };
  });

  return (
    <View style={styles.container} accessibilityLabel={t('timeline.title')}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[styles.list, rtl.container]}
        ListEmptyComponent={
          <Text style={[styles.empty, rtl.text]} accessibilityRole="text">
            {t('timeline.empty')}
          </Text>
        }
        renderItem={({ item }) => (
          <View
            style={styles.card}
            accessibilityRole="summary"
            accessibilityLabel={`${item.appName}, ${item.title}, ${item.description}`}
          >
            <View style={[styles.header, rtl.row]}>
              <Text style={[styles.appName, rtl.text]}>{item.appName}</Text>
              {item.level && <RiskBadge level={item.level} />}
            </View>
            <Text style={styles.eventTitle}>{item.title}</Text>
            <Text style={styles.explanation}>{item.description}</Text>
            <Text style={styles.timestamp}>
              {new Date(item.timestamp).toLocaleString(
                i18n.language === 'he' ? 'he-IL' : undefined,
              )}
            </Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  list: { padding: 16 },
  empty: { textAlign: 'center', color: colors.textSecondary, marginTop: 40 },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    minHeight: 44,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: { fontSize: 16, fontWeight: '600', color: colors.text },
  eventTitle: { fontSize: 14, fontWeight: '500', color: colors.text, marginBottom: 4 },
  explanation: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  timestamp: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
});
