import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useGuardianStore } from '../store/guardian-store';
import { RiskBadge } from '../components/RiskBadge';
import { colors } from '../theme';
import type { RootStackParamList } from '../navigation/types';
import { RiskLevel } from '@guardian/shared';

export function AppsScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { apps, assessments } = useGuardianStore();

  const getLevel = (appId: string): RiskLevel => {
    const a = assessments.find((as) => as.appId === appId);
    return a?.level ?? RiskLevel.SAFE;
  };

  return (
    <View style={styles.container}>
      <FlatList
        data={apps}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>{t('apps.noApps')}</Text>}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => navigation.navigate('AppDetails', { appId: item.id })}
          >
            <View style={styles.cardHeader}>
              <Text style={styles.appName}>{item.displayName}</Text>
              <RiskBadge level={getLevel(item.id)} />
            </View>
            <Text style={styles.packageName}>{item.packageName}</Text>
          </TouchableOpacity>
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
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appName: { fontSize: 17, fontWeight: '600', color: colors.text, flex: 1 },
  packageName: { fontSize: 12, color: colors.textSecondary, marginTop: 6 },
});
