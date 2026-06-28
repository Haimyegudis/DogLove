import 'dotenv/config';

const config = {
  name: 'כלב LOVE',
  slug: 'doglove',
  owner: 'haimye',
  scheme: 'doglove',
  orientation: 'portrait',
  userInterfaceStyle: 'light',
  icon: './assets/icon.png',
  android: {
    package: 'com.doglove.app',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#FFE1EC',
    },
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
