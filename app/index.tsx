import { useEffect, useState } from 'react';
import { Redirect } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { useAuth } from '../src/state/AuthContext';
import { hasSeenDataNotice } from '../src/state/consent';

export default function Index() {
  const { session, loading } = useAuth();
  const [noticeSeen, setNoticeSeen] = useState<boolean | null>(null);

  useEffect(() => { hasSeenDataNotice().then(setNoticeSeen); }, []);

  if (loading || noticeSeen === null) {
    return <View style={{ flex: 1, justifyContent: 'center' }}><ActivityIndicator /></View>;
  }
  if (!noticeSeen) return <Redirect href="/notice" />;
  if (!session) return <Redirect href="/(auth)/login" />;
  return <Redirect href="/(app)/(tabs)" />;
}
