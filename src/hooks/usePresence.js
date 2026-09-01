import { useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function usePresence(user, profile) {
  const [onlineIds, setOnlineIds] = useState([]);
  useEffect(() => {
    if (!supabase || !user?.id || !profile) return undefined;
    const channel = supabase.channel('symbiosis-online', { config: { presence: { key: user.id } } });
    const sync = () => setOnlineIds(Object.keys(channel.presenceState()));
    channel.on('presence', { event: 'sync' }, sync).subscribe(async status => {
      if (status === 'SUBSCRIBED') await channel.track({ user_id:user.id, username:profile.username, online_at:new Date().toISOString() });
    });
    return () => { void channel.untrack(); void supabase.removeChannel(channel); };
  }, [profile?.username, user?.id]);
  return { onlineIds, isOnline: id => onlineIds.includes(id) };
}
