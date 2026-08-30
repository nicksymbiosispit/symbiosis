import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function useDirectMessages(user, selectedPerson) {
  const userId = user?.id || null;
  const personId = selectedPerson?.id || null;
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!supabase || !userId || !personId) {
      setMessages([]);
      return;
    }
    const filter = `and(sender_id.eq.${userId},recipient_id.eq.${personId}),and(sender_id.eq.${personId},recipient_id.eq.${userId})`;
    const { data, error } = await supabase.from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at')
      .or(filter)
      .order('created_at')
      .limit(200);
    if (error) setStatus(error.message);
    else setMessages(data || []);
  }, [personId, userId]);

  useEffect(() => {
    if (!supabase || !userId || !personId) return undefined;
    let active = true;
    void load();
    const channel = supabase.channel(`private-dms-${userId}-${personId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, () => {
        if (active) void load();
      })
      .subscribe();
    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [load, personId, userId]);

  const send = useCallback(async (body) => {
    const clean = String(body || '').trim();
    if (!clean || !userId || !personId || !supabase) return false;
    setStatus('sending…');
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: userId,
      recipient_id: personId,
      body: clean
    });
    if (error) {
      setStatus(error.message);
      return false;
    }
    setStatus('sent!');
    await load();
    window.setTimeout(() => setStatus(''), 800);
    return true;
  }, [load, personId, userId]);

  return { messages, status, send };
}
