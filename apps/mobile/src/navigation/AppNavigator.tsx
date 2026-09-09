import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { I18nManager } from 'react-native';
import { HomeScreen } from '../screens/HomeScreen';
import { AppsScreen } from '../screens/AppsScreen';
import { AppDetailsScreen } from '../screens/AppDetailsScreen';
import { AlertScreen } from '../screens/AlertScreen';
import { TimelineScreen } from '../screens/TimelineScreen';
import { PermissionsScreen } from '../screens/PermissionsScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { LegalDocumentScreen } from '../screens/LegalDocumentScreen';
import { AboutScreen } from '../screens/AboutScreen';
import { colors } from '../theme';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

export function AppNavigator() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'he';

  if (I18nManager.isRTL !== isRTL) {
    I18nManager.allowRTL(isRTL);
    I18nManager.forceRTL(isRTL);
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: colors.white,
          headerTitleStyle: { fontWeight: '600' },
        }}
      >
        <Stack.Screen name="Home" component={HomeScreen} options={{ title: t('home.title') }} />
        <Stack.Screen name="Apps" component={AppsScreen} options={{ title: t('apps.title') }} />
        <Stack.Screen
          name="AppDetails"
          component={AppDetailsScreen}
          options={{ title: t('appDetails.title') }}
        />
        <Stack.Screen name="Alert" component={AlertScreen} options={{ title: t('alert.title') }} />
        <Stack.Screen
          name="Timeline"
          component={TimelineScreen}
          options={{ title: t('timeline.title') }}
        />
        <Stack.Screen
          name="Permissions"
          component={PermissionsScreen}
          options={{ title: t('permissions.title') }}
        />
        <Stack.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ title: t('settings.title') }}
        />
        <Stack.Screen
          name="LegalDocument"
          component={LegalDocumentScreen}
          options={({ route }) => ({
            title: route.params.type === 'privacy' ? t('legal.privacy') : t('legal.terms'),
          })}
        />
        <Stack.Screen name="About" component={AboutScreen} options={{ title: t('about.title') }} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
