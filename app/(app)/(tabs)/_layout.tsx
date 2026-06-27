import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, font } from '../../../src/theme';

export default function TabsLayout() {
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
      <Tabs.Screen name="index" options={{ title: 'בית', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🏠</Text> }} />
      <Tabs.Screen name="map" options={{ title: 'מפה', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🗺️</Text> }} />
      <Tabs.Screen name="playdates" options={{ title: 'משחקים', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>❤️</Text> }} />
      <Tabs.Screen name="messages" options={{ title: 'הודעות', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>💬</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'פרופיל', tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>🐶</Text> }} />
    </Tabs>
  );
}
