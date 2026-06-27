jest.mock('expo-constants', () => ({
  expoConfig: { extra: { supabaseUrl: 'https://x.supabase.co', supabaseAnonKey: 'anon' } },
}));

jest.mock('@react-native-async-storage/async-storage', () => ({
  setItem: jest.fn(),
  getItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}));

test('exports a supabase client with auth', () => {
  const { supabase } = require('../src/lib/supabase');
  expect(supabase).toBeDefined();
  expect(supabase.auth).toBeDefined();
});
