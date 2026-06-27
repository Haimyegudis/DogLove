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
  plugins: [
    'expo-router',
    'expo-web-browser',
    '@react-native-community/datetimepicker',
    'expo-font',
    'expo-image-picker',
    [
      '@rnmapbox/maps',
      { RNMapboxMapsDownloadToken: process.env.MAPBOX_DOWNLOAD_TOKEN },
    ],
    [
      'expo-location',
      { locationWhenInUsePermission: 'נשתמש במיקום שלך כדי להראות כלבים קרובים בזמן שאתה בהליכה.' },
    ],
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    mapboxPublicToken: process.env.MAPBOX_PUBLIC_TOKEN,
  },
};

export default config;
