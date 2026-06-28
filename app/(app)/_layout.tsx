import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/state/AuthContext';
import { colors, font } from '../../src/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  // Guard the signed-in group: when the session clears (e.g. sign-out),
  // bounce back to login instead of stranding the user on a stale screen.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.bgApp }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

  // Stack screens get a themed header with a back button; the tab group and
  // the OAuth callback hide it.
  return (
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
    </Stack>
  );
}
