import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../lib/supabase';

// Show notifications while the app is foregrounded too.
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

// Register for push and persist the Expo push token to the user's profile.
// No-ops gracefully in Expo Go / web (remote push needs a dev or production build).
export async function registerForPush(userId: string): Promise<void> {
  try {
    if (Platform.OS === 'web') return;

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.DEFAULT,
      });
    }

    const settings = await Notifications.getPermissionsAsync();
    let granted = settings.granted;
    if (!granted) {
      const req = await Notifications.requestPermissionsAsync();
      granted = req.granted;
    }
    if (!granted) return;

    const projectId =
      (Constants.expoConfig?.extra as { eas?: { projectId?: string } } | undefined)?.eas?.projectId ??
      (Constants as any)?.easConfig?.projectId;
    if (!projectId) return; // dev build not yet linked to an EAS project

    const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    if (token) {
      await supabase.from('profiles').update({ push_token: token }).eq('id', userId);
    }
  } catch {
    // Expo Go (SDK 53+) can't get a remote push token — ignore silently.
  }
}
