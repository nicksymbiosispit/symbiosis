import { useEffect, useState } from 'react';
import { ensureProfile } from '../services/profiles.js';
import { isConfigured, supabase } from '../services/supabase.js';

export function useAuth() {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(isConfigured);
  const [status, setStatus] = useState(isConfigured ? '' : 'Supabase is not configured. Move your URL and publishable/anon key into src/config.js.');

  // Keep the auth callback synchronous. Calling other Supabase queries from
  // inside onAuthStateChange can lock or repeat during session restoration.
  useEffect(() => {
    if (!supabase) return undefined;
    let active = true;

    supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return;
      if (error) setStatus(error.message);
      setUser(data.session?.user || null);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (active) setUser(session?.user || null);
    });

    return () => {
      active = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Load the profile once when the authenticated user ID changes.
  useEffect(() => {
    let active = true;
    if (!user) {
      setProfile(null);
      setLoading(false);
      return () => { active = false; };
    }

    setLoading(true);
    ensureProfile(user)
      .then((nextProfile) => {
        if (!active) return;
        setProfile(nextProfile);
        setStatus('');
      })
      .catch((error) => {
        if (active) setStatus(error.message || 'Could not load your account.');
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => { active = false; };
  }, [user?.id]);

  async function signIn(email, password) {
    if (!supabase) return setStatus('Supabase is not configured. Add both values to src/config.js.');
    setStatus('Signing you in…');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setStatus(error.message);
  }

  async function signUp(username, email, password) {
    if (!supabase) return setStatus('Supabase is not configured. Add both values to src/config.js.');
    if (username.trim().length < 2) return setStatus('Username must be at least 2 characters.');
    setStatus('Creating your account…');
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { username: username.trim() } }
    });
    if (error) return setStatus(error.message);
    setStatus(data.session
      ? 'Welcome to Symbiosis!'
      : 'Account created! Check your email to confirm it, then sign in.');
  }

  return {
    user, profile, loading, status, signIn, signUp, setProfile,
    signOut: () => supabase?.auth.signOut()
  };
}
