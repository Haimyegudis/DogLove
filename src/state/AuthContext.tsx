import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getSession, onAuthStateChange, signOut as authSignOut } from '../services/auth';
import { ensureProfile } from '../services/profile';

type AuthValue = { session: Session | null; loading: boolean; signOut: () => Promise<void> };
const AuthContext = createContext<AuthValue>({ session: null, loading: true, signOut: async () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    async function apply(s: Session | null) {
      if (!active) return;
      setSession(s);
      if (s?.user) await ensureProfile(s.user.id, (s.user.app_metadata as any)?.provider);
      setLoading(false);
    }
    getSession().then(apply);
    const sub = onAuthStateChange(apply);
    return () => { active = false; sub.unsubscribe(); };
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading, signOut: authSignOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
