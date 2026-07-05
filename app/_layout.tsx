import { useEffect } from 'react';
import { View } from 'react-native';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import {
  useFonts,
  Heebo_400Regular,
  Heebo_500Medium,
  Heebo_700Bold,
  Heebo_800ExtraBold,
} from '@expo-google-fonts/heebo';
import { SuezOne_400Regular } from '@expo-google-fonts/suez-one';
import { AuthProvider } from '../src/state/AuthContext';
import { LanguageProvider } from '../src/i18n/LanguageContext';
import { ToastProvider } from '../src/components/Toast';
import { colors } from '../src/theme';

// NOTE: We intentionally do NOT call I18nManager.forceRTL/allowRTL here.
// This app mirrors its layout MANUALLY for Hebrew — every screen and shared
// component hardcodes `flexDirection: 'row-reverse'`, `textAlign: 'right'`, and
// `writingDirection: 'rtl'` on top of React Native's default LTR base. Forcing
// native RTL would double-flip that manual mirroring (row-reverse under an
// already-flipped base resolves back to LTR), breaking layout on native builds.
// No runtime logic reads I18nManager.isRTL, so leaving the base as LTR is safe.

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Heebo_400Regular,
    Heebo_500Medium,
    Heebo_700Bold,
    Heebo_800ExtraBold,
    SuezOne_400Regular,
  });

  // Proceed once fonts are ready OR failed to load — a font-fetch failure on a
  // cold start must not leave the app stuck on the cream splash (relaunch bug).
  const ready = fontsLoaded || !!fontError;

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  if (!ready) {
    // Hold on a warm cream field until the brand font is ready.
    return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  }

  return (
    <LanguageProvider>
      <AuthProvider>
        <ToastProvider>
          <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }} />
        </ToastProvider>
      </AuthProvider>
    </LanguageProvider>
  );
}
