import { ScrollView, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { APP_VERSION } from '../config/app-config';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';
import type { RootStackParamList } from '../navigation/types';

export function AboutScreen() {
  const { t } = useTranslation();
  const rtl = useRtl();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, rtl.container]}>
      <Text style={[styles.appName, rtl.text]} accessibilityRole="header">
        Guardian
      </Text>
      <Text style={[styles.version, rtl.text]}>{t('about.version', { version: APP_VERSION })}</Text>
      <Text style={[styles.description, rtl.text]}>{t('about.description')}</Text>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.navigate('LegalDocument', { type: 'privacy' })}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t('legal.privacy')}</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.linkRow}
        onPress={() => navigation.navigate('LegalDocument', { type: 'terms' })}
        accessibilityRole="button"
      >
        <Text style={styles.linkText}>{t('legal.terms')}</Text>
      </TouchableOpacity>

      <Text style={[styles.copyright, rtl.text]}>{t('about.copyright')}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 24, alignItems: 'center' },
  appName: { fontSize: 28, fontWeight: '700', color: colors.text, marginBottom: 8 },
  version: { fontSize: 14, color: colors.textSecondary, marginBottom: 24 },
  description: {
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 32,
  },
  linkRow: { paddingVertical: 14, minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 16, fontWeight: '600' },
  copyright: { fontSize: 12, color: colors.textSecondary, marginTop: 32 },
});
