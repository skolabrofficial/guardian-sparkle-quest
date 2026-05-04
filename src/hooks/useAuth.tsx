import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { User, Session } from '@supabase/supabase-js';

type AppRole = 'rektor' | 'spravce' | 'lektor' | 'student';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  role: AppRole | null;
  profile: { display_name: string; avatar_url: string | null; last_seen: string | null } | null;
  loading: boolean;
  isBlocked: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isStaff: boolean;
  isRektor: boolean;
  isSpravce: boolean;
  isLektor: boolean;
  /** @deprecated use isRektor */
  isDeveloper: boolean;
  /** @deprecated use isSpravce */
  isDohledci: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [profile, setProfile] = useState<{ display_name: string; avatar_url: string | null; last_seen: string | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);

  const fetchUserData = async (userId: string) => {
    const [roleRes, profileRes, blockRes] = await Promise.all([
      supabase.from('user_roles').select('role').eq('user_id', userId).limit(1).single(),
      supabase.from('profiles').select('display_name, avatar_url, last_seen').eq('user_id', userId).limit(1).single(),
      supabase.from('user_blocks').select('id').eq('user_id', userId).eq('is_active', true).limit(1).maybeSingle(),
    ]);
    if (roleRes.data) setRole(roleRes.data.role as AppRole);
    if (profileRes.data) setProfile(profileRes.data);
    setIsBlocked(!!blockRes.data);
  };

  // Update last_seen periodically + log IP once per session
  useEffect(() => {
    if (!user) return;
    const updateLastSeen = () => {
      supabase.from('profiles').update({ last_seen: new Date().toISOString() } as any).eq('user_id', user.id).then(() => {});
    };
    updateLastSeen();
    // Fire-and-forget IP log (edge function dedupes consecutive identical IPs)
    supabase.functions.invoke('log-ip').catch(() => {});
    const interval = setInterval(updateLastSeen, 60000);
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => fetchUserData(session.user.id), 0);
      } else {
        setRole(null);
        setProfile(null);
        setIsBlocked(false);
      }
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) fetchUserData(session.user.id);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null };
  };

  const signUp = async (email: string, password: string, displayName: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { display_name: displayName }, emailRedirectTo: window.location.origin },
    });
    return { error: error as Error | null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const isDeveloper = role === 'rektor';
  const isDohledci = role === 'spravce';
  const isLektor = role === 'lektor';
  const isStaff = isDeveloper || isDohledci;

  return (
    <AuthContext.Provider value={{ user, session, role, profile, loading, isBlocked, signIn, signUp, signOut, isStaff, isDeveloper, isDohledci, isLektor }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
