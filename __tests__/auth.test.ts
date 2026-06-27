jest.mock('../src/lib/supabase', () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  };
  return { supabase: { auth: mockAuth } };
});

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'exp://localhost'),
}));

import * as auth from '../src/services/auth';
import { supabase } from '../src/lib/supabase';

const mockAuth = (supabase.auth as any);

beforeEach(() => jest.clearAllMocks());

test('signUpWithEmail returns no error on success', async () => {
  mockAuth.signUp.mockResolvedValue({ error: null });
  const res = await auth.signUpWithEmail('a@b.com', 'pw123456');
  expect(mockAuth.signUp).toHaveBeenCalledWith({ email: 'a@b.com', password: 'pw123456' });
  expect(res.error).toBeNull();
});

test('signInWithEmail surfaces an error message', async () => {
  mockAuth.signInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } });
  const res = await auth.signInWithEmail('a@b.com', 'wrong');
  expect(res.error).toBe('Invalid login credentials');
});

test('signInWithGoogle calls OAuth with google provider', async () => {
  mockAuth.signInWithOAuth.mockResolvedValue({ error: null });
  const res = await auth.signInWithGoogle();
  expect(mockAuth.signInWithOAuth.mock.calls[0][0].provider).toBe('google');
  expect(res.error).toBeNull();
});

test('getSession returns the session', async () => {
  mockAuth.getSession.mockResolvedValue({ data: { session: { user: { id: 'u1' } } } });
  const s = await auth.getSession();
  expect(s?.user.id).toBe('u1');
});

test('signOut calls supabase.auth.signOut', async () => {
  mockAuth.signOut.mockResolvedValue(undefined);
  await auth.signOut();
  expect(mockAuth.signOut).toHaveBeenCalled();
});

test('onAuthStateChange subscribes and returns unsubscribe', () => {
  const mockUnsubscribe = jest.fn();
  mockAuth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: mockUnsubscribe } } });
  const result = auth.onAuthStateChange(() => {});
  expect(result).toHaveProperty('unsubscribe');
  result.unsubscribe();
  expect(mockUnsubscribe).toHaveBeenCalled();
});
