import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';

export function TimelineScreen() {
  const { t } = useTranslation();
  const { assessments, apps } = useGuardianStore();

  const items = assessments
    .map((a) => {
      const app = apps.find((ap) => ap.id === a.appId);
      return { ...a, appName: app?.displayName ?? 'Unknown' };
    })
    .sort((a, b) => new Date(b.assessedAt).getTime() - new Date(a.assessedAt).getTime());

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('timeline.empty')}</Text>}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.appName}>{item.appName}</Text>
              <RiskBadge level={item.level} />
            </View>
            <Text style={styles.explanation}>{item.explanation}</Text>
            <Text style={styles.timestamp}>{new Date(item.assessedAt).toLocaleString()}</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  appName: { fontSize: 16, fontWeight: '600', color: colors.text },
  explanation: { fontSize: 14, color: colors.textSecondary, lineHeight: 20 },
  timestamp: { fontSize: 12, color: colors.textSecondary, marginTop: 8 },
});
