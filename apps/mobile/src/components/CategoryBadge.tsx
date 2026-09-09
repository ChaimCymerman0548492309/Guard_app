import { View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { AppCategory } from '@guardian/shared';
import { colors } from '../theme';

interface CategoryBadgeProps {
  category: AppCategory;
}

export function CategoryBadge({ category }: CategoryBadgeProps) {
  const { t } = useTranslation();

  return (
    <View style={styles.badge}>
      <Text style={styles.text}>{t(`category.${category}`)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.textSecondary + '40',
    alignSelf: 'flex-start',
  },
  text: {
    fontSize: 11,
    fontWeight: '500',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
});
