import { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Switch,
  TouchableOpacity,
  Share,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { getDatabase } from '../db/database';
import {
  getRetentionDays,
  setRetentionDays,
  areNotificationsEnabled,
  setNotificationsEnabled,
  isCloudSyncEnabled,
  setCloudSyncEnabled,
  getLanguage,
  setLanguage,
} from '../services/settings-service';
import i18n from '../i18n';
import { exportDataAsJson } from '../services/export-service';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';

const RETENTION_OPTIONS = [7, 14, 30, 60, 90];
const LANGUAGE_OPTIONS: Array<{ code: 'en' | 'he'; label: string }> = [
  { code: 'en', label: 'English' },
  { code: 'he', label: 'עברית' },
];

export function SettingsScreen() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const [retentionDays, setRetentionDaysState] = useState(30);
  const [notificationsOn, setNotificationsOn] = useState(true);
  const [cloudSyncOn, setCloudSyncOn] = useState(false);
  const [language, setLanguageState] = useState<'en' | 'he'>('en');

  const loadSettings = useCallback(async () => {
    const db = await getDatabase();
    setRetentionDaysState(await getRetentionDays(db));
    setNotificationsOn(await areNotificationsEnabled(db));
    setCloudSyncOn(await isCloudSyncEnabled(db));
    setLanguageState(await getLanguage(db));
  }, []);

  useEffect(() => {
    void loadSettings();
  }, [loadSettings]);

  const handleExport = async () => {
    try {
      const db = await getDatabase();
      const json = await exportDataAsJson(db);
      await Share.share({ message: json, title: 'Guardian export' });
    } catch {
      Alert.alert(t('settings.exportError'));
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, rtl.container]}>
      <Text style={[styles.sectionTitle, rtl.text]}>{t('settings.retention')}</Text>
      <View style={[styles.chipRow, rtl.row]}>
        {RETENTION_OPTIONS.map((days) => (
          <TouchableOpacity
            key={days}
            style={[styles.chip, retentionDays === days && styles.chipActive]}
            onPress={() => {
              void getDatabase().then(async (db) => {
                await setRetentionDays(db, days);
                setRetentionDaysState(days);
              });
            }}
          >
            <Text style={styles.chipText}>{days}d</Text>
          </TouchableOpacity>
        ))}
      </View>

      <View style={[styles.row, rtl.row]}>
        <Text style={styles.label}>{t('settings.notifications')}</Text>
        <Switch
          value={notificationsOn}
          onValueChange={(v) => {
            void getDatabase().then(async (db) => {
              await setNotificationsEnabled(db, v);
              setNotificationsOn(v);
            });
          }}
        />
      </View>

      <Text style={[styles.sectionTitle, rtl.text]}>{t('settings.language')}</Text>
      <View style={[styles.chipRow, rtl.row]}>
        {LANGUAGE_OPTIONS.map((option) => (
          <TouchableOpacity
            key={option.code}
            style={[styles.chip, language === option.code && styles.chipActive]}
            onPress={() => {
              void getDatabase().then(async (db) => {
                await setLanguage(db, option.code);
                await i18n.changeLanguage(option.code);
                setLanguageState(option.code);
              });
            }}
            accessibilityRole="button"
            accessibilityState={{ selected: language === option.code }}
          >
            <Text style={styles.chipText}>{option.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <Text style={[styles.hint, rtl.text]}>{t('settings.restartHint')}</Text>

      <View style={[styles.row, rtl.row]}>
        <Text style={styles.label}>{t('settings.cloudSync')}</Text>
        <Switch
          value={cloudSyncOn}
          onValueChange={(v) => {
            void getDatabase().then(async (db) => {
              await setCloudSyncEnabled(db, v);
              setCloudSyncOn(v);
            });
          }}
        />
      </View>

      <TouchableOpacity style={styles.exportButton} onPress={() => void handleExport()}>
        <Text style={styles.exportText}>{t('settings.export')}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 12 },
  label: { fontSize: 15, color: colors.text, flex: 1 },
  row: { flexDirection: 'row', alignItems: 'center', marginVertical: 12 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  chip: { padding: 10, borderRadius: 20, backgroundColor: colors.card, borderWidth: 1, borderColor: '#e5e7eb' },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { color: colors.text },
  hint: { fontSize: 12, color: colors.textSecondary, marginBottom: 8 },
  exportButton: { marginTop: 24, backgroundColor: colors.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  exportText: { color: colors.white, fontWeight: '600' },
});
