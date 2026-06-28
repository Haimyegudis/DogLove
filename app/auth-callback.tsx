import { useEffect } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../src/lib/supabase';
import { colors } from '../src/theme';

// Deep-link target for OAuth (doglove://auth-callback?code=...). Completes the
// PKCE exchange when the redirect lands here as a route, then routes onward.
export default function AuthCallback() {
  const params = useLocalSearchParams<{ code?: string; error_description?: string }>();
  const router = useRouter();

  useEffect(() => {
    (async () => {
      const code = typeof params.code === 'string' ? params.code : undefined;
      if (code) {
        try { await supabase.auth.exchangeCodeForSession(code); } catch {}
      }
      router.replace('/');
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
}
