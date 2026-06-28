import { makeRedirectUri } from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

// Lets the in-app browser dismiss cleanly after returning from the OAuth flow.
WebBrowser.maybeCompleteAuthSession();

export async function signUpWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signUp({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithEmail(email: string, password: string) {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  return { error: error?.message ?? null };
}

export async function signInWithGoogle() {
  const redirectTo = makeRedirectUri({ scheme: 'doglove', path: 'auth-callback' });

  // 1. Ask Supabase for the Google authorization URL (don't auto-redirect —
  //    we drive the browser ourselves so we can capture the result).
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo, skipBrowserRedirect: true },
  });
  if (error) return { error: error.message };
  if (!data?.url) return { error: 'לא הוחזר קישור התחברות מ-Google' };

  // 2. Open the system auth browser and wait for the redirect back to the app.
  const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
  if (result.type !== 'success') return { error: null }; // user cancelled/dismissed

  // 3. Pull the PKCE `code` from the redirect URL and exchange it for a session.
  const { queryParams } = Linking.parse(result.url);
  const oauthError = queryParams?.error_description;
  if (oauthError) return { error: String(oauthError) };
  const code = queryParams?.code;
  if (typeof code !== 'string') return { error: null };

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  return { error: exchangeError?.message ?? null };
}

export async function sendPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim());
  return { error: error?.message ?? null };
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}

export async function getSession(): Promise<Session | null> {
  const { data } = await supabase.auth.getSession();
  return data.session ?? null;
}

export function onAuthStateChange(cb: (session: Session | null) => void) {
  const { data } = supabase.auth.onAuthStateChange((_event, session) => cb(session));
  return { unsubscribe: () => data.subscription.unsubscribe() };
}
