import { ScrollView, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { LEGAL_CONTENT, type LegalDocumentType } from '../content/legal-content';
import { getPrivacyPolicyUrl } from '../config/app-config';
import { colors } from '../theme';
import { useRtl } from '../hooks/use-rtl';
import type { RootStackParamList } from '../navigation/types';

export function LegalDocumentScreen() {
  const { t, i18n } = useTranslation();
  const rtl = useRtl();
  const route = useRoute<RouteProp<RootStackParamList, 'LegalDocument'>>();
  const docType: LegalDocumentType = route.params.type;
  const lang = i18n.language === 'he' ? 'he' : 'en';
  const content = LEGAL_CONTENT[docType][lang];
  const showOnlineLink = docType === 'privacy';

  const openOnline = () => {
    void Linking.openURL(getPrivacyPolicyUrl());
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.content, rtl.container]}>
      <Text style={[styles.body, rtl.text]} accessibilityRole="text">{content}</Text>
      {showOnlineLink && (
        <TouchableOpacity
          style={styles.linkButton}
          onPress={openOnline}
          accessibilityRole="link"
          accessibilityLabel={t('legal.viewOnline')}
        >
          <Text style={styles.linkText}>{t('legal.viewOnline')}</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: 20 },
  body: { fontSize: 15, color: colors.text, lineHeight: 24 },
  linkButton: { marginTop: 24, alignItems: 'center', minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 15, fontWeight: '600' },
});
