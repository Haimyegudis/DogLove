import { useEffect, useState } from 'react';
import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { listIncoming } from '../../../src/services/match';
import { useI18n } from '../../../src/i18n/LanguageContext';
import { colors, font } from '../../../src/theme';

export default function TabsLayout() {
  const { t } = useI18n();
  // In-app notification badge: number of pending incoming playdate requests.
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let active = true;
    const tick = () => listIncoming().then(({ data }) => {
      if (active) setPending((data || []).filter((r) => r.status === 'pending').length);
    });
    tick();
    const id = setInterval(tick, 30000);
    return () => { active = false; clearInterval(id); };
  }, []);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.rose,
        tabBarInactiveTintColor: colors.inkCoolSoft,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.lineCool, height: 62, paddingBottom: 8, paddingTop: 6 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 11 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: t('tabs.home'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tabs.Screen name="map" options={{ title: t('tabs.map'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text> }} />
      <Tabs.Screen
        name="playdates"
        options={{ title: t('tabs.playdates'), tabBarBadge: pending || undefined, tabBarBadgeStyle: { backgroundColor: colors.rose }, tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text> }}
      />
      <Tabs.Screen name="messages" options={{ title: t('tabs.messages'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
      <Tabs.Screen name="profile" options={{ title: t('tabs.profile'), tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🐶</Text> }} />
    </Tabs>
  );
}
