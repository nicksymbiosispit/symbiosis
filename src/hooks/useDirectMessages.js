import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../services/supabase.js';

export function useDirectMessages(user, selectedPerson) {
  const [messages, setMessages] = useState([]);
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    if (!user || !selectedPerson) { setMessages([]); return; }
    const filter = `and(sender_id.eq.${user.id},recipient_id.eq.${selectedPerson.id}),and(sender_id.eq.${selectedPerson.id},recipient_id.eq.${user.id})`;
    const { data, error } = await supabase.from('direct_messages')
      .select('id, sender_id, recipient_id, body, created_at').or(filter).order('created_at').limit(200);
    if (error) setStatus(error.message); else setMessages(data || []);
  }, [selectedPerson, user]);

  useEffect(() => {
    if (!user) return undefined;
    load();
    const channel = supabase.channel(`private-dms-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'direct_messages' }, load).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [load, user]);

  async function send(body) {
    const clean = body.trim();
    if (!clean || !selectedPerson) return false;
    setStatus('sending…');
    const { error } = await supabase.from('direct_messages').insert({
      sender_id: user.id, recipient_id: selectedPerson.id, body: clean
    });
    if (error) { setStatus(error.message); return false; }
    setStatus('sent!'); await load(); window.setTimeout(() => setStatus(''), 800); return true;
  }
  return { messages, status, send };
}
