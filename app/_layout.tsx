import { I18nManager } from 'react-native';
import { Stack } from 'expo-router';
import { AuthProvider } from '../src/state/AuthContext';

if (!I18nManager.isRTL) {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}
