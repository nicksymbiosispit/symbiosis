import { useCallback, useEffect, useState } from 'react';
import { attachProfiles } from '../services/profiles.js';
import { supabase } from '../services/supabase.js';

export function useMessages(user) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !user) return;
    const { data, error } = await supabase.from('messages').select('id, user_id, body, created_at')
      .order('created_at', { ascending: true }).limit(100);
    if (error) return setStatus(error.message);
    try { setMessages(await attachProfiles(data || [])); }
    catch (profileError) { setStatus(profileError.message); }
  }, [user]);

  useEffect(() => {
    if (!supabase || !user) { setMessages([]); return undefined; }
    load();
    const channel = supabase.channel('symbiosis-lobby')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async ({ new: row }) => {
        try {
          const [message] = await attachProfiles([row]);
          setMessages((current) => {
            if (current.some((item) => item.id === message.id)) return current;
            return [...current, message].sort((a, b) => new Date(a.created_at) - new Date(b.created_at)).slice(-100);
          });
        } catch (error) { setStatus(error.message); }
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user]);

  async function send(body) {
    const clean = body.trim();
    if (!clean || !user) return false;
    if (clean.length > 500) { setStatus('Keep messages under 500 characters.'); return false; }
    setStatus('sending…');
    const { error } = await supabase.from('messages').insert({ user_id: user.id, body: clean });
    if (error) { setStatus(error.message); return false; }
    setStatus('sent!');
    window.setTimeout(() => setStatus(''), 900);
    return true;
  }

  return { messages, status, send };
}
