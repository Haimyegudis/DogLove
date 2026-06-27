import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors, font } from '../../../src/theme';

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.coralDeep,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarStyle: { backgroundColor: colors.white, borderTopColor: colors.line, height: 60, paddingBottom: 8 },
        tabBarLabelStyle: { fontFamily: font.medium, fontSize: 12 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{ title: 'מפה', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🗺️</Text> }}
      />
      <Tabs.Screen
        name="playdates"
        options={{ title: 'משחקים', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>❤️</Text> }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'פרופיל', tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>🐶</Text> }}
      />
    </Tabs>
  );
}
