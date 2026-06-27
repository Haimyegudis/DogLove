import { Redirect, Stack } from 'expo-router';
import { View } from 'react-native';
import { useAuth } from '../../src/state/AuthContext';
import { colors } from '../../src/theme';

export default function AuthLayout() {
  const { session, loading } = useAuth();

  // Once authenticated, leave the auth group automatically (covers email +
  // Google sign-in completing via onAuthStateChange).
  if (loading) return <View style={{ flex: 1, backgroundColor: colors.cream }} />;
  if (session) return <Redirect href="/(app)/home" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
