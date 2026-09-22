import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import en from './en.json';
import he from './he.json';

const deviceLocale = Localization.getLocales()[0]?.languageCode ?? 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    he: { translation: he },
  },
  lng: deviceLocale === 'en' ? 'en' : 'he',
  fallbackLng: 'he',
  interpolation: { escapeValue: false },
});

export default i18n;
