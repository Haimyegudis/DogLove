import 'dotenv/config';

const config = {
  name: 'כלב LOVE',
  slug: 'doglove',
  owner: 'haimye',
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
      'expo-location',
      { locationWhenInUsePermission: 'נשתמש במיקום שלך כדי להראות כלבים קרובים בזמן שאתה בהליכה.' },
    ],
    'expo-notifications',
  ],
  extra: {
    supabaseUrl: process.env.SUPABASE_URL,
    supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
    eas: { projectId: process.env.EAS_PROJECT_ID },
  },
};

export default config;
