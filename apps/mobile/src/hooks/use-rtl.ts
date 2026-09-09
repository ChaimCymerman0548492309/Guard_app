import { useTranslation } from 'react-i18next';
import type { TextStyle, ViewStyle } from 'react-native';

export interface RtlStyles {
  isRTL: boolean;
  text: TextStyle;
  row: ViewStyle;
  container: ViewStyle;
  borderStart: (color: string, width?: number) => ViewStyle;
}

export function useRtl(): RtlStyles {
  const { i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  return {
    isRTL,
    text: isRTL ? { textAlign: 'right', writingDirection: 'rtl' } : {},
    row: isRTL ? { flexDirection: 'row-reverse' } : {},
    container: isRTL ? { direction: 'rtl' } : {},
    borderStart: (color: string, width = 3) =>
      isRTL
        ? { borderRightWidth: width, borderRightColor: color }
        : { borderLeftWidth: width, borderLeftColor: color },
  };
}
