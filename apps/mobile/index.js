import { registerRootComponent } from 'expo';
import { AppRegistry } from 'react-native';
import App from './App';

registerRootComponent(App);

AppRegistry.registerHeadlessTask('GuardianBackgroundSync', () => async () => {
  const { drainVpnQueue } = await import('./src/store/guardian-store');
  await drainVpnQueue();
});
