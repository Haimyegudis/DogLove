import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/state/AuthContext';
import { colors } from '../../src/theme';

export default function AppLayout() {
  const { session, loading } = useAuth();

  // Guard the signed-in group: when the session clears (e.g. sign-out),
  // bounce back to login instead of stranding the user on a stale screen.
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  if (!session) return <Redirect href="/(auth)/login" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
