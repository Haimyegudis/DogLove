import { useEffect } from 'react';
import { View, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { useI18n } from '../src/i18n/LanguageContext';
import { colors } from '../src/theme';

// Deep-link target for OAuth (doglove://auth-callback?code=...). Completes the
// PKCE exchange when the redirect lands here as a route, then routes onward.
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    (async () => {
      // The provider may redirect with an error instead of a code.
      if (typeof params.error_description === 'string' && params.error_description) {
        Alert.alert(t('auth.oauthFailedTitle'), params.error_description);
        router.replace('/(auth)/login');
        return;
      }
      const code = typeof params.code === 'string' ? params.code : undefined;
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code);
        if (error) {
          // Surface the failure instead of silently landing on a logged-out app.
          Alert.alert(t('auth.oauthFailedTitle'), error.message);
          router.replace('/(auth)/login');
          return;
        }
      }
      router.replace('/');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
}
