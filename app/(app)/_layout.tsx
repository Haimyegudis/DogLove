import { useEffect } from 'react';
import { Redirect, Stack, useRouter, usePathname } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/state/AuthContext';
import { useToast } from '../../src/components/Toast';
import { subscribeInboxMessages } from '../../src/services/chat';
import { colors, font } from '../../src/theme';

// Foreground "you got mail" toast: any incoming message from another user that
// isn't from the chat you're already looking at pops a tappable banner.
function MessageToastListener({ userId }: { userId: string }) {
  const { showToast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const sub = subscribeInboxMessages((m) => {
      if (m.sender_id === userId) return;                 // my own message
      if (pathname?.includes(m.conversation_id)) return;  // already in this chat
      showToast({
        title: 'הודעה חדשה 💬',
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

  // Guard the signed-in group: when the session clears (e.g. sign-out),
  // bounce back to login instead of stranding the user on a stale screen.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgApp }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

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
        headerTitleStyle: { fontFamily: font.bold, color: colors.brandDark },
        headerShadowVisible: false,
        headerBackTitle: 'חזרה',
        title: '',
      }}
    >
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="edit-profile" options={{ title: 'הפרופיל שלי' }} />
      <Stack.Screen name="dog/[id]" options={{ title: 'כלב' }} />
      <Stack.Screen name="browse" options={{ title: 'הכרויות' }} />
      <Stack.Screen name="request/[dogId]" options={{ title: 'בקשת משחק' }} />
      <Stack.Screen name="search" options={{ title: 'חיפוש' }} />
      <Stack.Screen name="calendar" options={{ title: 'יומן' }} />
      <Stack.Screen name="privacy" options={{ title: 'פרטיות' }} />
      <Stack.Screen name="chat/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="feed" options={{ title: 'גלריה' }} />
      <Stack.Screen name="new-post" options={{ title: 'שיתוף תמונה' }} />
      <Stack.Screen name="lost-dogs" options={{ title: 'כלבים נעדרים' }} />
      <Stack.Screen name="report-lost" options={{ title: 'דיווח על כלב נעדר' }} />
      <Stack.Screen name="walk-stats" options={{ title: 'הסטטיסטיקה שלי' }} />
      <Stack.Screen name="dog-health/[dogId]" options={{ title: 'בריאות הכלב' }} />
      <Stack.Screen name="social-walks" options={{ title: 'טיולים קבוצתיים' }} />
      <Stack.Screen name="new-social-walk" options={{ title: 'טיול קבוצתי חדש' }} />
      <Stack.Screen name="walkers" options={{ title: 'מטיילי כלבים' }} />
      <Stack.Screen name="challenges" options={{ title: 'אתגרי כושר' }} />
      <Stack.Screen name="badges" options={{ title: 'ההישגים שלי' }} />
      <Stack.Screen name="places" options={{ title: 'שירותים בקרבת מקום' }} />
      <Stack.Screen name="premium" options={{ title: 'Premium' }} />
      <Stack.Screen name="active-walkers" options={{ title: 'מטיילים פעילים' }} />
      <Stack.Screen name="place/[id]" options={{ title: 'מקום' }} />
      <Stack.Screen name="dog-view/[dogId]" options={{ title: 'כרטיס כלב' }} />
      <Stack.Screen name="owner-view/[userId]" options={{ title: 'פרופיל' }} />
    </Stack>
    </>
  );
}
