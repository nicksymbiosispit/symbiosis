import { useCallback, useEffect, useState } from 'react';
import { ensureProfile } from '../services/profiles.js';
import { isConfigured, supabase } from '../services/supabase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [status, setStatus] = useState(isConfigured ? '' : 'Add your Supabase URL and publishable key in src/config.js.');

  const loadUser = useCallback(async (nextUser) => {
    if (!nextUser) {
      setUser(null); setProfile(null); setLoading(false); return;
    }
    setLoading(true);
    try {
      const nextProfile = await ensureProfile(nextUser);
      setUser(nextUser); setProfile(nextProfile); setStatus('');
    } catch (error) {
      setStatus(error.message || 'Could not load your account.');
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) loadUser(data.session?.user || null); });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) loadUser(session?.user || null);
    });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, [loadUser]);

  async function signIn(email, password) {
    if (!supabase) return setStatus('Supabase is not configured yet.');
    setStatus('Signing you in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus(error.message);
  }

  async function signUp(username, email, password) {
    if (!supabase) return setStatus('Supabase is not configured yet.');
    if (username.trim().length < 2) return setStatus('Username must be at least 2 characters.');
    setStatus('Creating your account…');
    const { data, error } = await supabase.auth.signUp({
      email, password, options: { data: { username: username.trim() } }
    });
    if (error) return setStatus(error.message);
    if (!data.session) return setStatus('Account created! Check your email to confirm it, then sign in.');
    try { await ensureProfile(data.user, username.trim()); setStatus('Welcome to Symbiosis!'); }
    catch (profileError) { setStatus(profileError.message || 'Your profile could not be saved.'); }
  }

  return { user, profile, loading, status, signIn, signUp, setProfile, signOut: () => supabase?.auth.signOut() };
}
