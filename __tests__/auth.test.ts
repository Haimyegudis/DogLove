jest.mock('../src/lib/supabase', () => {
  const mockAuth = {
    signUp: jest.fn(),
    signInWithPassword: jest.fn(),
    signInWithOAuth: jest.fn(),
    exchangeCodeForSession: jest.fn(),
    signOut: jest.fn(),
    getSession: jest.fn(),
    onAuthStateChange: jest.fn(),
  };
  return { supabase: { auth: mockAuth } };
});

jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn(() => 'doglove://auth-callback'),
}));

jest.mock('expo-web-browser', () => ({
  maybeCompleteAuthSession: jest.fn(),
  openAuthSessionAsync: jest.fn(),
}));

jest.mock('expo-linking', () => ({
  parse: jest.fn(),
}));

import * as auth from '../src/services/auth';
import { supabase } from '../src/lib/supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const mockAuth = (supabase.auth as any);
const mockOpen = (WebBrowser.openAuthSessionAsync as jest.Mock);
const mockParse = (Linking.parse as jest.Mock);

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

test('signInWithGoogle runs PKCE flow and exchanges the code for a session', async () => {
  mockAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2' }, error: null });
  mockOpen.mockResolvedValue({ type: 'success', url: 'doglove://auth-callback?code=abc123' });
  mockParse.mockReturnValue({ queryParams: { code: 'abc123' } });
  mockAuth.exchangeCodeForSession.mockResolvedValue({ error: null });

  const res = await auth.signInWithGoogle();

  expect(mockAuth.signInWithOAuth.mock.calls[0][0].provider).toBe('google');
  expect(mockAuth.signInWithOAuth.mock.calls[0][0].options.skipBrowserRedirect).toBe(true);
  expect(mockOpen).toHaveBeenCalledWith('https://accounts.google.com/o/oauth2', 'doglove://auth-callback');
  expect(mockAuth.exchangeCodeForSession).toHaveBeenCalledWith('abc123');
  expect(res.error).toBeNull();
});

test('signInWithGoogle returns no error and does not exchange when the user cancels', async () => {
  mockAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://accounts.google.com/o/oauth2' }, error: null });
  mockOpen.mockResolvedValue({ type: 'cancel' });

  const res = await auth.signInWithGoogle();

  expect(mockAuth.exchangeCodeForSession).not.toHaveBeenCalled();
  expect(res.error).toBeNull();
});

test('signInWithGoogle surfaces a session-exchange error', async () => {
  mockAuth.signInWithOAuth.mockResolvedValue({ data: { url: 'https://x' }, error: null });
  mockOpen.mockResolvedValue({ type: 'success', url: 'doglove://auth-callback?code=bad' });
  mockParse.mockReturnValue({ queryParams: { code: 'bad' } });
  mockAuth.exchangeCodeForSession.mockResolvedValue({ error: { message: 'invalid code' } });

  const res = await auth.signInWithGoogle();

  expect(res.error).toBe('invalid code');
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
