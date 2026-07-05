import { useEffect } from 'react';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/state/AuthContext';
import { useToast } from '../../src/components/Toast';
import { useOnboarding } from '../../src/hooks/useOnboarding';
import { subscribeInboxMessages } from '../../src/services/chat';
import { useI18n } from '../../src/i18n/LanguageContext';
import { colors, font } from '../../src/theme';

// Foreground "you got mail" toast: any incoming message from another user that
// isn't from the chat you're already looking at pops a tappable banner.
function MessageToastListener({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useI18n();

  useEffect(() => {
    const sub = subscribeInboxMessages((m) => {
      if (m.sender_id === userId) return;                 // my own message
      if (pathname?.includes(m.conversation_id)) return;  // already in this chat
      showToast({
        title: t('chat.newMessageToast'),
        body: m.body,
        onPress: () => router.push(`/(app)/chat/${m.conversation_id}`),
      });
    });
    return () => { sub.unsubscribe(); };
  }, [userId, pathname, showToast, router]);

  return null;
}

export default function AppLayout() {
  const { session, loading } = useAuth();
  const { seen } = useOnboarding();
  const pathname = usePathname();
  const { t } = useI18n();

  // Guard the signed-in group: when the session clears (e.g. sign-out),
  // bounce back to login instead of stranding the user on a stale screen.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgApp }} />;
  if (!session) return <Redirect href="/(auth)/login" />;
  // First-run: show the onboarding carousel once.
  if (seen === false && !pathname?.includes('onboarding')) return <Redirect href="/(app)/onboarding" />;

  // Stack screens get a themed header with a back button; the tab group and
  // the OAuth callback hide it.
  return (
    <>
    <MessageToastListener userId={session.user.id} />
    <Stack
      screenOptions={{
        headerShown: true,
        headerStyle: { backgroundColor: colors.bgApp },
        headerTintColor: colors.rose,
        headerTitleStyle: { fontFamily: font.display, color: colors.brandDark, fontSize: 18 },
        headerShadowVisible: false,
        headerBackTitle: t('common.back'),
        title: '',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ title: t('nav.editProfile') }} />
      <Stack.Screen name="dog/[id]" options={{ title: t('nav.dog') }} />
      <Stack.Screen name="browse" options={{ title: t('nav.browse') }} />
      <Stack.Screen name="request/[dogId]" options={{ title: t('nav.request') }} />
      <Stack.Screen name="search" options={{ title: t('nav.search') }} />
      <Stack.Screen name="calendar" options={{ title: t('nav.calendar') }} />
      <Stack.Screen name="privacy" options={{ title: t('nav.privacy') }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="feed" options={{ title: t('nav.feed') }} />
      <Stack.Screen name="new-post" options={{ title: t('nav.newPost') }} />
      <Stack.Screen name="lost-dogs" options={{ title: t('nav.lostDogs') }} />
      <Stack.Screen name="report-lost" options={{ title: t('nav.reportLost') }} />
      <Stack.Screen name="walk-stats" options={{ title: t('nav.walkStats') }} />
      <Stack.Screen name="dog-health/[dogId]" options={{ title: t('nav.dogHealth') }} />
      <Stack.Screen name="social-walks" options={{ title: t('nav.socialWalks') }} />
      <Stack.Screen name="new-social-walk" options={{ title: t('nav.newSocialWalk') }} />
      <Stack.Screen name="walkers" options={{ title: t('nav.walkers') }} />
      <Stack.Screen name="challenges" options={{ title: t('nav.challenges') }} />
      <Stack.Screen name="badges" options={{ title: t('nav.badges') }} />
      <Stack.Screen name="places" options={{ title: t('nav.places') }} />
      <Stack.Screen name="premium" options={{ title: t('nav.premium') }} />
      <Stack.Screen name="active-walkers" options={{ title: t('nav.activeWalkers') }} />
      <Stack.Screen name="place/[id]" options={{ title: t('nav.place') }} />
      <Stack.Screen name="dog-view/[dogId]" options={{ title: t('nav.dogView') }} />
      <Stack.Screen name="owner-view/[userId]" options={{ title: t('nav.ownerView') }} />
      <Stack.Screen name="discover-people" options={{ title: t('nav.discoverPeople') }} />
      <Stack.Screen name="park-checkins" options={{ title: t('nav.parkCheckins') }} />
      <Stack.Screen name="onboarding" options={{ headerShown: false }} />
    </Stack>
    </>
  );
}
