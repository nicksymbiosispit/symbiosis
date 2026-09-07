import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';
import { listProfiles } from '../services/profiles.js';

export function usePeople(userId) {
  const [people, setPeople] = useState([]);
  const [status, setStatus] = useState('');
  const reload = useCallback(async () => {
    if (!userId) return;
    try { setPeople(await listProfiles(userId)); }
    catch (error) { setStatus(error.message); }
  }, [userId]);
  useEffect(() => {
    void reload();
    if (!supabase || !userId) return undefined;
    const channel = supabase.channel(`people-profile-updates-${userId}-${crypto.randomUUID()}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, reload)
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [reload, userId]);
  return { people, status, reload };
}
