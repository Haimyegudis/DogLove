import 'dotenv/config';
import { ExpoConfig } from 'expo/config';

const config: ExpoConfig = {
  name: 'כלב LOVE',
  slug: 'doglove',
  scheme: 'doglove',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  android: {
    package: 'com.doglove.app',
  },
  plugins: ['expo-router', 'expo-web-browser'],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
  },
};

export default config;
